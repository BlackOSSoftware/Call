"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLeadsQuery } from "@/hooks/useLeadsQuery";
import { usePostCallResume } from "@/hooks/usePostCallResume";
import { useCrmStore } from "@/store/useCrmStore";
import {
  LeadCard,
  LeadSkeletonList,
  type QuickStatusKey,
} from "@/features/leads/LeadCard";
import { CallOutcomeFlow } from "@/features/leads/CallOutcomeFlow";
import { WhatsAppSheet } from "@/features/leads/WhatsAppSheet";
import {
  patchLeadMark,
  patchLeadStatus,
  buildLeadsQuery,
} from "@/services/leads-api";
import type { Lead, LeadsListResponse } from "@/types/lead";
import {
  checkCallPermission,
  placeNativeCall,
  requestCallPermission,
} from "@/lib/call-service";
import {
  isValidDialNumber,
  normalizeDialInput,
  toCallableNumber,
} from "@/lib/phone-utils";

function bodyForQuick(key: QuickStatusKey) {
  switch (key) {
    case "read":
      return { callStatus: "read" as const, interestStatus: "pending" as const };
    case "npc":
      return { callStatus: "npc" as const, interestStatus: "pending" as const };
    case "picked":
      return { callStatus: "picked" as const, interestStatus: "pending" as const };
    case "interested":
      return { callStatus: "picked" as const, interestStatus: "interested" as const };
    case "not_interested":
      return {
        callStatus: "picked" as const,
        interestStatus: "not_interested" as const,
      };
  }
}

function applyPatchToLead(lead: Lead, body: ReturnType<typeof bodyForQuick>): Lead {
  return {
    ...lead,
    callStatus: body.callStatus,
    interestStatus: body.interestStatus,
    lastCalledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function applyMarkToLead(lead: Lead, mark: string): Lead {
  return {
    ...lead,
    mark,
    updatedAt: new Date().toISOString(),
  };
}

export function LeadsScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useLeadsQuery();
  const filters = useCrmStore((s) => s.filters);
  const setFilters = useCrmStore((s) => s.setFilters);
  const setCurrentLeadId = useCrmStore((s) => s.setCurrentLeadId);
  const setPendingPostCall = useCrmStore((s) => s.setPendingPostCall);
  const clearPendingPostCall = useCrmStore((s) => s.clearPendingPostCall);
  const recordCallLocal = useCrmStore((s) => s.recordCallLocal);

  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [waLead, setWaLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (
      filters.limit !== 1 ||
      filters.q !== "" ||
      filters.callStatus !== "" ||
      filters.interestStatus !== ""
    ) {
      setFilters({
        q: "",
        callStatus: "",
        interestStatus: "",
        limit: 1,
        page: 1,
      });
    }
  }, [
    filters.callStatus,
    filters.interestStatus,
    filters.limit,
    filters.q,
    setFilters,
  ]);

  const quickMut = useMutation({
    mutationFn: async ({
      id,
      key,
    }: {
      id: string;
      key: QuickStatusKey;
    }) => patchLeadStatus(id, bodyForQuick(key)),

    onMutate: async ({ id, key }) => {
      const search = buildLeadsQuery(useCrmStore.getState().filters);
      const queryKey = ["leads", search] as const;
      await qc.cancelQueries({ queryKey });

      const previous = qc.getQueryData<LeadsListResponse>(queryKey);
      const body = bodyForQuick(key);

      if (previous) {
        qc.setQueryData<LeadsListResponse>(queryKey, {
          ...previous,
          data: previous.data.map((l) =>
            l._id === id ? applyPatchToLead(l, body) : l,
          ),
        });
      }

      return { previous, queryKey };
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.previous != null) {
        qc.setQueryData(ctx.queryKey, ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Update failed");
    },

    onSettled: (_d, _e, _v, ctx) => {
      if (ctx?.queryKey) {
        void qc.invalidateQueries({ queryKey: ctx.queryKey });
      }
    },
  });

  const markMut = useMutation({
    mutationFn: async ({ id, mark }: { id: string; mark: string }) =>
      patchLeadMark(id, mark),

    onMutate: async ({ id, mark }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });

      const previousEntries = qc
        .getQueriesData<LeadsListResponse>({ queryKey: ["leads"] })
        .flatMap(([queryKey, data]) => {
          if (!data) return [];
          const hasLead = data.data.some((l) => l._id === id);
          if (!hasLead) return [];

          qc.setQueryData<LeadsListResponse>(queryKey, {
            ...data,
            data: data.data.map((l) =>
              l._id === id ? applyMarkToLead(l, mark) : l,
            ),
          });

          return [{ queryKey, data }];
        });

      return { previousEntries };
    },

    onError: (err, _vars, ctx) => {
      ctx?.previousEntries.forEach(({ queryKey, data }) => {
        qc.setQueryData(queryKey, data);
      });
      toast.error(err instanceof Error ? err.message : "Mark update failed");
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const pullStart = useRef(0);
  const pulling = useRef(false);

  usePostCallResume(
    useCallback(() => {
      setOutcomeOpen(true);
    }, []),
  );

  const startCall = async (lead: Lead) => {
    setCurrentLeadId(lead._id);
    if (lead.callStatus !== "read") {
      quickMut.mutate({ id: lead._id, key: "read" });
    }

    const normalized = normalizeDialInput(lead.phone);
    if (!isValidDialNumber(normalized)) {
      toast.error("Invalid phone on this lead.");
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      toast.error("Calls require the Android app.");
      return;
    }

    setPendingPostCall({
      leadId: lead._id,
      phone: lead.phone,
      name: lead.name,
    });

    try {
      let perm = await checkCallPermission();
      if (perm === "prompt" || perm === "prompt-with-rationale") {
        perm = await requestCallPermission();
      }
      if (perm !== "granted") {
        clearPendingPostCall();
        toast.error("Phone permission is required.");
        return;
      }
      await placeNativeCall(toCallableNumber(normalized));
      recordCallLocal(lead.phone, lead.name);
    } catch (e) {
      clearPendingPostCall();
      toast.error(e instanceof Error ? e.message : "Call failed");
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    pullStart.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || !scrollRef.current) return;
    if (scrollRef.current.scrollTop > 0) return;
    const dy = e.touches[0].clientY - pullStart.current;
    if (dy > 72) {
      pulling.current = false;
      void refetch();
    }
  };

  const currentLead = data?.data[0] ?? null;
  const totalPages = data?.totalPages ?? 1;
  const hasLead = !!currentLead;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F6F7FB]">
      <header className="shrink-0 bg-[#F6F7FB] px-5 pb-2 pt-[max(0.9rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <h1 className="text-[1rem] font-bold tracking-tight text-slate-950">
              Leads
            </h1>
            <p className="text-[0.72rem] font-semibold text-slate-400">
              {data ? `Lead ${filters.page} of ${totalPages}` : "Loading"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 active:scale-95"
            onClick={() => void refetch()}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-hidden px-5 pb-3 pt-2"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {isLoading && <LeadSkeletonList />}
        {isError && (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-[13px] font-semibold text-rose-600">
            {(error as Error).message}
          </div>
        )}
        {!isLoading && data && data.data.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-2 rounded-[22px] border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
            <p className="text-[1rem] font-bold text-slate-950">
              No lead found
            </p>
            <p className="max-w-xs text-[13px]">
              Try a different search or clear the active filters.
            </p>
          </div>
        )}
        {currentLead && (
          <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
            <LeadCard
              key={currentLead._id}
              lead={currentLead}
              onCall={(l) => void startCall(l)}
              onWhatsApp={(l) => setWaLead(l)}
              onQuickStatus={(l, key) => quickMut.mutate({ id: l._id, key })}
              onMarkSave={(l, mark) => markMut.mutate({ id: l._id, mark })}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-14px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex h-11 min-w-[6.5rem] items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm transition active:scale-[0.98] disabled:pointer-events-none disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
            disabled={!hasLead || filters.page <= 1}
            onClick={() => setFilters({ page: Math.max(1, filters.page - 1), limit: 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <span className="min-w-0 text-center text-[12px] font-semibold text-slate-500">
            {data ? `Lead ${filters.page} of ${totalPages}` : "Loading"}
          </span>
          <button
            type="button"
            className="inline-flex h-11 min-w-[6.5rem] items-center justify-center gap-1.5 rounded-2xl bg-slate-950 px-4 text-[13px] font-bold text-white shadow-sm transition active:scale-[0.98] disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            disabled={!hasLead || filters.page >= totalPages}
            onClick={() => setFilters({ page: filters.page + 1, limit: 1 })}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <CallOutcomeFlow open={outcomeOpen} onClose={() => setOutcomeOpen(false)} />
      <WhatsAppSheet
        open={!!waLead}
        phone={waLead?.phone ?? ""}
        onClose={() => setWaLead(null)}
      />
    </div>
  );
}
