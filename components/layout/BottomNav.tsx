"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Phone } from "lucide-react";
import clsx from "clsx";

const tabs = [
  { href: "/", label: "Leads", icon: LayoutGrid },
  { href: "/dialer", label: "Dialer", icon: Phone },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#09090B]/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around gap-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname === ""
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={clsx(
                "flex min-h-[48px] min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors",
                active
                  ? "bg-[#18181B] text-[#22C55E]"
                  : "text-[#A1A1AA] active:bg-[#18181B]/80",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="text-[0.65rem] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
