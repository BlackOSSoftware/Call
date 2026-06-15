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
    <div className="grid w-full max-w-sm grid-cols-3 gap-3 px-1">
      {ROWS.flatMap((row, ri) =>
        row.map((digit, ci) => {
          if (digit === null) {
            return (
              <div
                key={`spacer-${ri}-${ci}`}
                className="aspect-square min-h-[4.25rem]"
                aria-hidden
              />
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
              className="group relative flex aspect-square min-h-[4.25rem] max-h-[5.5rem] w-full items-center justify-center rounded-2xl border border-white/[0.07] bg-[#151515]/55 text-2xl font-semibold text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-150 active:scale-[0.96] active:bg-[#1c1c1c] disabled:pointer-events-none disabled:opacity-40"
            >
              <span
                className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, rgba(59,130,246,0.12), transparent 55%)",
                }}
              />
              <span className="relative z-10">{digit}</span>
            </button>
          );
        }),
      )}
    </div>
  );
}
