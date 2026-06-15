"use client";

import { hapticMedium } from "@/lib/haptics";

type CallButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function CallButton({ onPress, loading, disabled }: CallButtonProps) {
  const isBusy = loading || disabled;

  return (
    <div className="flex w-full flex-col items-center gap-2 pt-2">
      <button
        type="button"
        aria-label="Call"
        disabled={isBusy}
        onClick={() => {
          void hapticMedium();
          onPress();
        }}
        className={`relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[#22C55E] text-white shadow-[0_12px_40px_rgba(34,197,94,0.35)] transition-all duration-200 active:scale-95 disabled:opacity-60 ${!loading ? "qd-fab-idle" : ""}`}
      >
        <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity hover:opacity-100" />
        {loading ? (
          <span className="relative z-10 h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <PhoneIcon className="relative z-10 h-8 w-8" />
        )}
      </button>
      <span className="text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
        {loading ? "Calling…" : "Call"}
      </span>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
        fill="currentColor"
      />
    </svg>
  );
}
