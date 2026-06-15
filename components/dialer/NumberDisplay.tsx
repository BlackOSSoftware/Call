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
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#151515]/70 px-5 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-[transform,box-shadow] duration-300"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div
        className={`min-h-[3.25rem] text-center font-mono text-3xl font-semibold tracking-widest sm:text-4xl ${
          isPlaceholder ? "text-[#A1A1AA]" : "text-white"
        } transition-colors duration-200`}
        aria-live="polite"
      >
        {display}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
