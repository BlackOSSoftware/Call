"use client";

type NumberDisplayProps = {
  value: string;
  placeholder?: string;
};

export function NumberDisplay({
  value,
  placeholder = "Enter number",
}: NumberDisplayProps) {
  const display = value.length > 0 ? value : placeholder;
  const isPlaceholder = value.length === 0;

  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151515] px-3 py-2.5 shadow-inner">
      <div
        className={`truncate text-center font-mono text-[clamp(1.125rem,4.2vmin,1.625rem)] font-semibold tracking-[0.12em] ${
          isPlaceholder ? "text-[#A1A1AA]" : "text-white"
        }`}
        aria-live="polite"
        title={value.length > 0 ? value : undefined}
      >
        {display}
      </div>
    </div>
  );
}
