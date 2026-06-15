"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        richColors
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "bg-[#151515]/95 backdrop-blur-xl border border-white/10 text-white shadow-2xl",
            title: "text-white font-medium",
            description: "text-[#A1A1AA]",
          },
        }}
      />
    </>
  );
}
