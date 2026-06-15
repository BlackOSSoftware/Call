"use client";

import { hapticLight } from "@/lib/haptics";

const ROWS: (string | null)[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [null, "0", "#"],
];

type DialPadProps = {
  onDigit: (digit: string) => void;
  disabled?: boolean;
};

export function DialPad({ onDigit, disabled }: DialPadProps) {
  return (
    <div className="grid h-full min-h-0 w-full max-w-[18.5rem] grid-cols-3 grid-rows-4 gap-x-2 gap-y-2 self-center [contain:paint]">
      {ROWS.flatMap((row, ri) =>
        row.map((digit, ci) => {
          if (digit === null) {
            return (
              <div key={`spacer-${ri}-${ci}`} className="min-h-0" aria-hidden />
            );
          }
          return (
            <button
              key={digit + String(ri) + String(ci)}
              type="button"
              disabled={disabled}
              onClick={() => {
                void hapticLight();
                onDigit(digit);
              }}
              className="flex min-h-[44px] min-w-0 touch-manipulation select-none items-center justify-center rounded-xl border border-white/[0.08] bg-[#181818] text-[clamp(1.1rem,4.5vmin,1.45rem)] font-semibold text-white shadow-sm transition-[transform,background-color] duration-75 active:scale-[0.97] active:bg-[#222] disabled:pointer-events-none disabled:opacity-40"
            >
              {digit}
            </button>
          );
        }),
      )}
    </div>
  );
}
