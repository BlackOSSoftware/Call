"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchLeadStatus } from "@/services/leads-api";
import { useCrmStore } from "@/store/useCrmStore";
import { hapticLight } from "@/lib/haptics";

type Step = "call" | "interest";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CallOutcomeFlow({ open, onClose }: Props) {
  const clearPending = useCrmStore((s) => s.clearPendingPostCall);
  const pending = useCrmStore((s) => s.pendingPostCall);
  const [step, setStep] = useState<Step>("call");
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setStep("call");
  }, [open]);

  const mutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{ callStatus: string; interestStatus: string }>;
    }) => patchLeadStatus(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const leadId = pending?.leadId;

  const closeAll = () => {
    setStep("call");
    clearPending();
    onClose();
  };

  const saveNpc = async () => {
    if (!leadId) {
      closeAll();
      return;
    }
    await mutation.mutateAsync({
      id: leadId,
      body: { callStatus: "npc", interestStatus: "pending" },
    });
    closeAll();
  };

  const goInterest = () => {
    void hapticLight();
    setStep("interest");
  };

  const savePicked = async (interest: "interested" | "not_interested") => {
    if (!leadId) {
      closeAll();
      return;
    }
    await mutation.mutateAsync({
      id: leadId,
      body: { callStatus: "picked", interestStatus: interest },
    });
    closeAll();
  };

  return (
    <AnimatePresence>
      {open && pending && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !mutation.isPending && closeAll()}
        >
          <motion.div
            role="dialog"
            aria-modal
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#18181B] shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div>
                <p className="text-xs text-[#A1A1AA]">
                  {step === "call" ? "Call result" : "Customer interest"}
                </p>
                <p className="truncate font-mono text-sm text-white">
                  {pending.name} · {pending.phone}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={mutation.isPending}
                className="rounded-full p-2 text-[#A1A1AA] transition active:scale-95 disabled:opacity-40"
                onClick={() => !mutation.isPending && closeAll()}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === "call" && (
              <div className="grid gap-2 p-4">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  className="rounded-2xl bg-[#22C55E] py-3.5 text-sm font-semibold text-black transition active:scale-[0.99] disabled:opacity-50"
                  onClick={() => void goInterest()}
                >
                  Picked
                </button>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  className="rounded-2xl border border-white/10 bg-[#27272A] py-3.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
                  onClick={() => void saveNpc()}
                >
                  NPC
                </button>
              </div>
            )}

            {step === "interest" && (
              <div className="grid gap-2 p-4">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  className="rounded-2xl bg-[#3B82F6] py-3.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
                  onClick={() => void savePicked("interested")}
                >
                  Interested
                </button>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  className="rounded-2xl border border-[#EF4444]/40 bg-[#27272A] py-3.5 text-sm font-semibold text-[#EF4444] transition active:scale-[0.99] disabled:opacity-50"
                  onClick={() => void savePicked("not_interested")}
                >
                  Not interested
                </button>
                <button
                  type="button"
                  className="text-center text-xs text-[#A1A1AA]"
                  onClick={() => setStep("call")}
                >
                  Back
                </button>
              </div>
            )}

            {mutation.isError && (
              <p className="px-4 pb-3 text-center text-xs text-[#EF4444]">
                {(mutation.error as Error).message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
