"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        theme="dark"
        richColors
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "bg-[#18181B] border border-white/10 text-white shadow-2xl",
            title: "text-white font-medium",
            description: "text-[#A1A1AA]",
          },
        }}
      />
    </QueryClientProvider>
  );
}
