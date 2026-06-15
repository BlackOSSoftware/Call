import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0A0A0A] px-6 text-center text-white">
      <p className="text-sm text-[#A1A1AA]">This screen is not available.</p>
      <Link
        href="/"
        className="rounded-2xl bg-[#22C55E] px-6 py-3 text-sm font-semibold text-white"
      >
        Back to dialer
      </Link>
    </div>
  );
}
