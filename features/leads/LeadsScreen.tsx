"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLeadsQuery } from "@/hooks/useLeadsQuery";
import { useDebouncedSearchInput } from "@/hooks/useDebouncedSearchInput";
import { usePostCallResume } from "@/hooks/usePostCallResume";
import { useCrmStore } from "@/store/useCrmStore";
import {
  LeadCard,
  LeadSkeletonList,
  type QuickStatusKey,
} from "@/features/leads/LeadCard";
import { CallOutcomeFlow } from "@/features/leads/CallOutcomeFlow";
import { WhatsAppSheet } from "@/features/leads/WhatsAppSheet";
import { patchLeadStatus, buildLeadsQuery } from "@/services/leads-api";
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
import { hapticLight } from "@/lib/haptics";

function bodyForQuick(key: QuickStatusKey) {
  switch (key) {
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

  const { local, setLocal } = useDebouncedSearchInput();

  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [waLead, setWaLead] = useState<Lead | null>(null);

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

  const toggleFilter = (
    key: "callStatus" | "interestStatus",
    value: string,
  ) => {
    void hapticLight();
    setFilters({
      [key]: filters[key] === value ? "" : value,
      page: 1,
    } as Partial<typeof filters>);
  };

  const statusFiltersActive =
    filters.callStatus !== "" || filters.interestStatus !== "";

  const clearStatusFilters = () => {
    if (!statusFiltersActive) return;
    void hapticLight();
    setFilters({ callStatus: "", interestStatus: "", page: 1 });
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

  const pageControls =
    data && data.totalPages > 1 ? (
      <div className="flex items-center justify-between gap-1.5 py-1.5 text-[10px] text-[#A1A1AA] max-[320px]:text-[9px]">
        <button
          type="button"
          className="flex items-center gap-0.5 rounded-lg border border-white/10 px-2 py-1.5 font-semibold text-white disabled:opacity-30 max-[320px]:px-1.5 max-[320px]:py-1"
          disabled={filters.page <= 1}
          onClick={() => setFilters({ page: filters.page - 1 })}
        >
          <ChevronLeft className="h-3.5 w-3.5 max-[320px]:h-3 max-[320px]:w-3" />{" "}
          Prev
        </button>
        <span>
          Page {filters.page} / {data.totalPages}
        </span>
        <button
          type="button"
          className="flex items-center gap-0.5 rounded-lg border border-white/10 px-2 py-1.5 font-semibold text-white disabled:opacity-30 max-[320px]:px-1.5 max-[320px]:py-1"
          disabled={filters.page >= data.totalPages}
          onClick={() => setFilters({ page: filters.page + 1 })}
        >
          Next{" "}
          <ChevronRight className="h-3.5 w-3.5 max-[320px]:h-3 max-[320px]:w-3" />
        </button>
      </div>
    ) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-white/[0.06] bg-[#09090B]/95 px-2 pb-1.5 pt-[max(0.2rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-[0.8125rem] font-bold tracking-tight text-white">
            Leads
          </h1>
          <span className="text-[0.55rem] font-medium uppercase tracking-wider text-zinc-600">
            CRM
          </span>
        </div>
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
          <input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-white/10 bg-zinc-900/90 py-1.5 pl-7 pr-8 text-[11px] text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-emerald-500/35"
          />
          <button
            type="button"
            aria-label="Refresh"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition hover:text-zinc-300 active:scale-95"
            onClick={() => void refetch()}
          >
            <RefreshCw
              className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="mt-1 rounded-lg border border-white/[0.06] bg-[#0C0C0E]/90 px-1.5 py-1">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="text-[0.55rem] font-semibold uppercase tracking-wider text-zinc-600">
              Filters
            </span>
            <button
              type="button"
              onClick={clearStatusFilters}
              disabled={!statusFiltersActive}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-transparent px-1 py-0.5 text-[0.55rem] font-semibold text-zinc-500 transition enabled:hover:border-white/10 enabled:hover:bg-white/[0.04] enabled:hover:text-zinc-200 enabled:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35"
            >
              <XCircle className="h-2.5 w-2.5" />
              Clear
            </button>
          </div>
          <div className="-mx-0.5 flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ["callStatus", "pending", "Pending"],
                ["callStatus", "picked", "Picked"],
                ["callStatus", "npc", "NPC"],
                ["interestStatus", "interested", "Interested"],
                ["interestStatus", "not_interested", "Not int."],
              ] as const
            ).map(([k, v, label]) => {
              const active = filters[k] === v;
              return (
                <button
                  key={`${k}-${v}`}
                  type="button"
                  title={label}
                  onClick={() => toggleFilter(k, v)}
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold whitespace-nowrap transition active:scale-[0.98] ${
                    active
                      ? "border-emerald-500/45 bg-emerald-500/12 text-emerald-300"
                      : "border-white/[0.08] bg-zinc-900 text-zinc-500 hover:border-white/12 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1 pt-0.5"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {isLoading && <LeadSkeletonList />}
        {isError && (
          <div className="mt-8 rounded-xl border border-[#EF4444]/30 bg-[#18181B] p-3 text-center text-[11px] text-[#EF4444] max-[320px]:text-[10px]">
            {(error as Error).message}
          </div>
        )}
        {!isLoading && data && data.data.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-2 text-center text-[#A1A1AA]">
            <p className="text-[0.95rem] font-semibold text-white max-[320px]:text-[0.875rem]">
              No leads yet
            </p>
            <p className="max-w-xs text-[11px] max-[320px]:text-[10px]">
              POST to <span className="font-mono text-xs">/api/leads</span> to
              add leads from your backend or scripts.
            </p>
          </div>
        )}
        {data && data.data.length > 0 && (
          <div className="flex flex-col gap-1">
            {data.data.map((lead) => (
              <LeadCard
                key={lead._id}
                lead={lead}
                onCall={(l) => void startCall(l)}
                onWhatsApp={(l) => setWaLead(l)}
                onQuickStatus={(l, key) =>
                  quickMut.mutate({ id: l._id, key })
                }
              />
            ))}
            {pageControls}
          </div>
        )}
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
