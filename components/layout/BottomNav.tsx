"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import clsx from "clsx";

const tabs = [
  { href: "/", label: "Leads", icon: LayoutGrid },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md"
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
                  ? "bg-emerald-50 text-emerald-600"
                  : "text-slate-500 active:bg-slate-100",
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
