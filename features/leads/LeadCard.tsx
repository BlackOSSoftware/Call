"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Phone } from "lucide-react";
import type { Lead } from "@/types/lead";
import { hapticLight } from "@/lib/haptics";

export type QuickStatusKey = "npc" | "picked" | "interested" | "not_interested";

function badge(
  label: string,
  tone: "neutral" | "green" | "blue" | "red" | "amber",
) {
  const map = {
    neutral: "border-zinc-700/50 bg-zinc-800/60 text-zinc-500",
    green: "border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-400/95",
    blue: "border-sky-500/15 bg-sky-500/[0.07] text-sky-300/95",
    red: "border-rose-500/15 bg-rose-500/[0.06] text-rose-300/95",
    amber: "border-amber-500/15 bg-amber-500/[0.06] text-amber-200/95",
  } as const;
  return (
    <span
      className={`inline-flex max-w-[5.5rem] shrink-0 truncate rounded px-1 py-px text-[8px] font-semibold capitalize leading-none ${map[tone]}`}
      title={label.replaceAll("_", " ")}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}

function callTone(s: Lead["callStatus"]) {
  if (s === "picked") return "green" as const;
  if (s === "npc") return "amber" as const;
  return "neutral" as const;
}

function interestTone(s: Lead["interestStatus"]) {
  if (s === "interested") return "blue" as const;
  if (s === "not_interested") return "red" as const;
  return "neutral" as const;
}

type Props = {
  lead: Lead;
  onCall: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onQuickStatus: (lead: Lead, key: QuickStatusKey) => void;
};

const rowBtnBase =
  "min-h-[30px] flex-1 touch-manipulation rounded-md border px-1 py-1 text-center text-[9px] font-semibold leading-tight tracking-tight transition-colors active:scale-[0.99]";

function rowBtnClasses(active: boolean, idle: string, activeExtra: string) {
  if (active) {
    return `${rowBtnBase} ${activeExtra} shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`;
  }
  return `${rowBtnBase} ${idle}`;
}

export function LeadCard({ lead, onCall, onWhatsApp, onQuickStatus }: Props) {
  const initials = lead.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const npcOn = lead.callStatus === "npc";
  const pickedOn = lead.callStatus === "picked";
  const hotOn = lead.interestStatus === "interested";
  const coldOn = lead.interestStatus === "not_interested";
  const showInterest = pickedOn;

  return (
    <article className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-gradient-to-b from-zinc-900/98 to-zinc-950 ring-1 ring-white/[0.02]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent"
        aria-hidden
      />

      <div className="p-1.5">
        <div className="flex gap-1.5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[10px] font-bold text-white ring-1 ring-white/[0.08]">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="min-w-0 truncate text-[12px] font-semibold leading-none tracking-tight text-white">
                {lead.name}
              </p>
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  aria-label="Call"
                  title="Call"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-zinc-950 shadow-sm ring-1 ring-emerald-400/20 transition active:scale-95"
                  onClick={() => {
                    void hapticLight();
                    onCall(lead);
                  }}
                >
                  <Phone className="h-[13px] w-[13px]" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  aria-label="WhatsApp"
                  title="WhatsApp"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-zinc-800/90 text-emerald-400 transition active:scale-95"
                  onClick={() => {
                    void hapticLight();
                    onWhatsApp(lead);
                  }}
                >
                  <MessageCircle
                    className="h-[13px] w-[13px]"
                    strokeWidth={2.25}
                  />
                </button>
              </div>
            </div>

            <div className="mt-0.5 flex items-center justify-between gap-1">
              <p className="min-w-0 flex-1 truncate font-mono text-[9px] tabular-nums leading-none text-zinc-500">
                {lead.phone}
              </p>
              <div className="flex shrink-0 items-center gap-0.5">
                {badge(lead.callStatus, callTone(lead.callStatus))}
                {badge(lead.interestStatus, interestTone(lead.interestStatus))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-1.5 rounded-md border border-white/[0.05] bg-black/30 p-1">
          <p className="sr-only">Call outcome</p>
          <div className="flex gap-0.5">
            <button
              type="button"
              title="No pickup"
              aria-label="No pickup"
              className={rowBtnClasses(
                npcOn,
                "border-white/[0.06] bg-zinc-950/50 text-zinc-600 hover:border-amber-500/15 hover:bg-amber-500/[0.04] hover:text-amber-100",
                "border-amber-500/30 bg-amber-500/10 text-amber-50 ring-1 ring-amber-400/25",
              )}
              aria-pressed={npcOn}
              onClick={() => {
                void hapticLight();
                onQuickStatus(lead, "npc");
              }}
            >
              NPC
            </button>
            <button
              type="button"
              title="Picked up"
              aria-label="Picked up"
              className={rowBtnClasses(
                pickedOn && !npcOn,
                "border-white/[0.06] bg-zinc-950/50 text-zinc-600 hover:border-emerald-500/15 hover:bg-emerald-500/[0.04] hover:text-emerald-100",
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-50 ring-1 ring-emerald-400/25",
              )}
              aria-pressed={pickedOn && !npcOn}
              onClick={() => {
                void hapticLight();
                onQuickStatus(lead, "picked");
              }}
            >
              Pickup
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showInterest ? (
              <motion.div
                key="interest"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  duration: 0.26,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="overflow-hidden"
              >
                <div className="mt-1 border-t border-white/[0.04] pt-1">
                  <p className="sr-only">Interest</p>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      title="Interested"
                      aria-label="Interested"
                      className={rowBtnClasses(
                        hotOn,
                        "border-white/[0.06] bg-zinc-950/50 text-zinc-600 hover:border-sky-500/15 hover:bg-sky-500/[0.04] hover:text-sky-100",
                        "border-sky-500/30 bg-sky-500/10 text-sky-50 ring-1 ring-sky-400/25",
                      )}
                      aria-pressed={hotOn}
                      onClick={() => {
                        void hapticLight();
                        onQuickStatus(lead, "interested");
                      }}
                    >
                      Interested
                    </button>
                    <button
                      type="button"
                      title="Not interested"
                      aria-label="Not interested"
                      className={rowBtnClasses(
                        coldOn,
                        "border-white/[0.06] bg-zinc-950/50 text-zinc-600 hover:border-rose-500/15 hover:bg-rose-500/[0.04] hover:text-rose-100",
                        "border-rose-500/30 bg-rose-500/10 text-rose-50 ring-1 ring-rose-400/25",
                      )}
                      aria-pressed={coldOn}
                      onClick={() => {
                        void hapticLight();
                        onQuickStatus(lead, "not_interested");
                      }}
                    >
                      Not int.
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </article>
  );
}

export function LeadSkeletonList() {
  return (
    <div className="flex flex-col gap-1 p-0.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-white/[0.05] bg-gradient-to-b from-zinc-900/95 to-zinc-950 p-1.5"
        >
          <div className="flex gap-1.5">
            <div className="h-8 w-8 shrink-0 rounded-md bg-zinc-800/80" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between gap-1">
                <div className="h-3 w-[50%] rounded bg-zinc-800/80" />
                <div className="flex gap-0.5">
                  <div className="h-8 w-8 rounded-md bg-zinc-800/60" />
                  <div className="h-8 w-8 rounded-md bg-zinc-800/60" />
                </div>
              </div>
              <div className="flex justify-between gap-1">
                <div className="h-2.5 w-[38%] rounded bg-zinc-800/50" />
                <div className="flex gap-0.5">
                  <div className="h-3 w-9 rounded bg-zinc-800/50" />
                  <div className="h-3 w-10 rounded bg-zinc-800/50" />
                </div>
              </div>
              <div className="mt-1.5 rounded-md border border-white/[0.04] bg-black/25 p-1">
                <div className="flex gap-0.5">
                  <div className="h-[30px] flex-1 rounded-md bg-zinc-800/50" />
                  <div className="h-[30px] flex-1 rounded-md bg-zinc-800/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
