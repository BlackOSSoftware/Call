"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { useQueryClient } from "@tanstack/react-query";
import { History, PhoneForwarded, Redo2 } from "lucide-react";
import { CallButton } from "@/components/dialer/CallButton";
import { DialPad } from "@/components/dialer/DialPad";
import { NumberDisplay } from "@/components/dialer/NumberDisplay";
import {
  checkCallPermission,
  placeNativeCall,
  requestCallPermission,
} from "@/lib/call-service";
import { hapticLight } from "@/lib/haptics";
import { useCrmStore } from "@/store/useCrmStore";
import { buildLeadsQuery, fetchLeadsList } from "@/services/leads-api";
import {
  isValidDialNumber,
  normalizeDialInput,
  toCallableNumber,
} from "@/lib/phone-utils";

export function DialerScreen() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const filters = useCrmStore((s) => s.filters);
  const currentLeadId = useCrmStore((s) => s.currentLeadId);
  const setCurrentLeadId = useCrmStore((s) => s.setCurrentLeadId);
  const setPendingPostCall = useCrmStore((s) => s.setPendingPostCall);
  const clearPendingPostCall = useCrmStore((s) => s.clearPendingPostCall);
  const recordCallLocal = useCrmStore((s) => s.recordCallLocal);
  const lastCalledPhone = useCrmStore((s) => s.lastCalledPhone);
  const lastCalledName = useCrmStore((s) => s.lastCalledName);
  const recentCalls = useCrmStore((s) => s.recentCalls);

  const append = useCallback((d: string) => {
    setValue((v) => normalizeDialInput(v + d));
  }, []);

  const backspace = useCallback(() => {
    void hapticLight();
    setValue((v) => v.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    void hapticLight();
    setValue("");
  }, []);

  const dial = useCallback(
    async (
      raw: string,
      meta?: { leadId: string | null; name?: string },
    ) => {
      const normalized = normalizeDialInput(raw);
      if (!isValidDialNumber(normalized)) {
        toast.error("Enter a valid number (at least 3 digits).");
        return;
      }
      if (!Capacitor.isNativePlatform()) {
        toast.error("Install the Android app to place calls.");
        return;
      }

      setPendingPostCall({
        leadId: meta?.leadId ?? null,
        phone: normalized,
        name: meta?.name ?? "",
      });

      setLoading(true);
      try {
        let perm = await checkCallPermission();
        if (perm === "prompt" || perm === "prompt-with-rationale") {
          perm = await requestCallPermission();
        }
        if (perm !== "granted") {
          clearPendingPostCall();
          toast.error("Phone permission required.");
          return;
        }
        const callable = toCallableNumber(normalized);
        await placeNativeCall(callable);
        recordCallLocal(callable, meta?.name);
      } catch (e) {
        clearPendingPostCall();
        toast.error(e instanceof Error ? e.message : "Call failed");
      } finally {
        setLoading(false);
      }
    },
    [
      clearPendingPostCall,
      recordCallLocal,
      setPendingPostCall,
    ],
  );

  const handleCallPad = () => void dial(value, { leadId: null, name: "" });

  const callLast = () => {
    if (!lastCalledPhone) {
      toast("No last called number yet.");
      return;
    }
    void dial(lastCalledPhone, { leadId: null, name: lastCalledName ?? "" });
  };

  const callNextLead = async () => {
    try {
      const q = buildLeadsQuery({
        ...filters,
        page: 1,
        limit: 200,
      });
      const res = await queryClient.fetchQuery({
        queryKey: ["leads", q],
        queryFn: () => fetchLeadsList(q),
      });
      const list = res.data;
      if (!list.length) {
        toast.error("No leads available.");
        return;
      }
      const idx = currentLeadId
        ? list.findIndex((l) => l._id === currentLeadId)
        : -1;
      const next = list[idx + 1];
      if (!next) {
        toast("No more leads available.");
        return;
      }
      setCurrentLeadId(next._id);
      await dial(next.phone, { leadId: next._id, name: next.name });
    } catch {
      toast.error("Could not load leads.");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#09090B]">
      <header className="shrink-0 px-3 pb-1 pt-[max(0.35rem,env(safe-area-inset-top))]">
        <h1 className="text-base font-bold text-white">Dialer</h1>
        <p className="text-[0.65rem] text-[#A1A1AA]">Manual entry & tools</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2">
        <NumberDisplay value={value} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={backspace}
            disabled={!value || loading}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/10 bg-[#18181B] text-xs font-semibold text-white disabled:opacity-35"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!value || loading}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/10 bg-[#18181B] text-xs font-semibold text-[#3B82F6] disabled:opacity-35"
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void callLast()}
            disabled={loading}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#22C55E]/30 bg-[#18181B] text-xs font-semibold text-[#22C55E] disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
            Last called
          </button>
          <button
            type="button"
            onClick={() => void callNextLead()}
            disabled={loading}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#3B82F6]/30 bg-[#18181B] text-xs font-semibold text-[#3B82F6] disabled:opacity-40"
          >
            <PhoneForwarded className="h-4 w-4" />
            Next lead
          </button>
        </div>

        <div className="min-h-[200px] flex-1">
          <DialPad onDigit={append} disabled={loading} />
        </div>

        {recentCalls.length > 0 && (
          <section>
            <div className="mb-1 flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[#A1A1AA]">
              <History className="h-3.5 w-3.5" />
              Recent calls
            </div>
            <div className="flex max-h-28 flex-col gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#18181B]/80 p-2">
              {recentCalls.map((r) => (
                <button
                  key={`${r.phone}-${r.at}`}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs text-white transition active:bg-white/5"
                  onClick={() => setValue(normalizeDialInput(r.phone))}
                >
                  <span className="font-mono">{r.phone}</span>
                  {r.name && (
                    <span className="truncate pl-2 text-[#A1A1AA]">{r.name}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-center pb-2 pt-1">
          <CallButton onPress={handleCallPad} loading={loading} />
        </div>
      </div>
    </div>
  );
}
