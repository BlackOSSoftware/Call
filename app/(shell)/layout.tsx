export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#F6F7FB] text-slate-950">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
