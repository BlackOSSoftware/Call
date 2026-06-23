"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Phone, UserRound } from "lucide-react";
import type { Lead } from "@/types/lead";
import { hapticLight } from "@/lib/haptics";

export type QuickStatusKey =
  | "read"
  | "npc"
  | "picked"
  | "interested"
  | "not_interested";

function badge(
  label: string,
  tone: "neutral" | "green" | "blue" | "red" | "amber",
) {
  const map = {
    neutral: "border-slate-200 bg-slate-50 text-slate-500",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  } as const;
  return (
    <span
      className={`inline-flex max-w-[8rem] shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold capitalize leading-none ${map[tone]}`}
      title={label.replaceAll("_", " ")}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}

function callTone(s: Lead["callStatus"]) {
  if (s === "picked") return "green" as const;
  if (s === "read") return "blue" as const;
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
  onMarkSave: (lead: Lead, mark: string) => void;
};

const rowBtnBase =
  "min-h-[42px] flex-1 touch-manipulation rounded-xl border px-2.5 py-2 text-center text-[12px] font-bold leading-tight transition active:scale-[0.99]";

function rowBtnClasses(active: boolean, idle: string, activeExtra: string) {
  if (active) {
    return `${rowBtnBase} ${activeExtra} shadow-sm`;
  }
  return `${rowBtnBase} ${idle}`;
}

export function LeadCard({
  lead,
  onCall,
  onWhatsApp,
  onQuickStatus,
  onMarkSave,
}: Props) {
  const [mark, setMark] = useState(lead.mark);
  const markRef = useRef(mark);
  const leadRef = useRef(lead);
  const onMarkSaveRef = useRef(onMarkSave);

  markRef.current = mark;
  leadRef.current = lead;
  onMarkSaveRef.current = onMarkSave;

  useEffect(() => {
    setMark(lead.mark);
  }, [lead._id, lead.mark]);

  const flushMark = () => {
    const next = markRef.current.trim();
    if (next === leadRef.current.mark) return;
    onMarkSaveRef.current(leadRef.current, next);
  };

  useEffect(() => () => flushMark(), []);

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
  const saveMark = () => {
    flushMark();
  };

  return (
    <article className="relative flex h-full min-h-0 flex-1 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-slate-900"
        aria-hidden
      />

      <div className="flex min-h-0 w-full flex-col px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-[15px] font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 justify-end gap-1.5">
            {badge(lead.callStatus, callTone(lead.callStatus))}
            {badge(lead.interestStatus, interestTone(lead.interestStatus))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center py-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-50 text-slate-400 ring-1 ring-slate-200">
            <UserRound className="h-7 w-7" strokeWidth={1.9} />
          </div>
          <h2 className="mt-4 break-words text-center text-[clamp(1.45rem,6.2vw,2.05rem)] font-black leading-[1.08] text-slate-950">
            {lead.name}
          </h2>
          <p className="mx-auto mt-3 w-full max-w-[18rem] break-words rounded-2xl bg-slate-50 px-4 py-2.5 text-center font-mono text-[0.95rem] font-semibold tabular-nums text-slate-600 ring-1 ring-slate-200">
            {lead.phone}
          </p>

          <div className="mx-auto mt-5 grid w-full max-w-[17rem] grid-cols-2 gap-2">
            <button
              type="button"
              aria-label="Call"
              title="Call"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-[13px] font-black text-white shadow-[0_12px_22px_rgba(16,185,129,0.24)] transition active:scale-[0.98]"
              onClick={() => {
                void hapticLight();
                onCall(lead);
              }}
            >
              <Phone className="h-[17px] w-[17px]" strokeWidth={2.35} />
              Call
            </button>
            <button
              type="button"
              aria-label="WhatsApp"
              title="WhatsApp"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-[13px] font-black text-emerald-700 transition active:scale-[0.98]"
              onClick={() => {
                void hapticLight();
                onWhatsApp(lead);
              }}
            >
              <MessageCircle className="h-[17px] w-[17px]" strokeWidth={2.35} />
              WhatsApp
            </button>
          </div>
        </div>

        <div className="shrink-0 rounded-[22px] border border-slate-200 bg-slate-50 p-2">
          <p className="sr-only">Call outcome</p>
          <div className="flex gap-2">
            <button
              type="button"
              title="No pickup"
              aria-label="No pickup"
              className={rowBtnClasses(
                npcOn,
                "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700",
                "border-amber-300 bg-amber-100 text-amber-800 ring-1 ring-amber-200",
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
                "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
                "border-emerald-300 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
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
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <p className="sr-only">Interest</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      title="Interested"
                      aria-label="Interested"
                      className={rowBtnClasses(
                        hotOn,
                        "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
                        "border-sky-300 bg-sky-100 text-sky-800 ring-1 ring-sky-200",
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
                        "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
                        "border-rose-300 bg-rose-100 text-rose-800 ring-1 ring-rose-200",
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
          <div className="mt-2 border-t border-slate-200 pt-2">
            <label className="sr-only" htmlFor={`mark-${lead._id}`}>
              Mark
            </label>
            <input
              id={`mark-${lead._id}`}
              value={mark}
              maxLength={300}
              onChange={(e) => setMark(e.target.value)}
              onBlur={saveMark}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Mark: call back, after lunch..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function LeadSkeletonList() {
  return (
    <div className="mx-auto flex h-full min-h-[32rem] w-full max-w-md">
      {Array.from({ length: 1 }).map((_, i) => (
        <div
          key={i}
          className="flex w-full animate-pulse flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-slate-200" />
            <div className="flex gap-1.5">
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-[22px] bg-slate-100" />
            <div className="mt-6 h-8 w-52 rounded bg-slate-200" />
            <div className="mt-3 h-12 w-64 rounded-2xl bg-slate-100" />
            <div className="mt-6 grid w-64 grid-cols-2 gap-2">
              <div className="h-12 rounded-2xl bg-slate-200" />
              <div className="h-12 rounded-2xl bg-slate-100" />
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-2">
            <div className="flex gap-2">
              <div className="h-[42px] flex-1 rounded-xl bg-slate-200" />
              <div className="h-[42px] flex-1 rounded-xl bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
