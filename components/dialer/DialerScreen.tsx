"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { CallButton } from "@/components/dialer/CallButton";
import { DialPad } from "@/components/dialer/DialPad";
import { NumberDisplay } from "@/components/dialer/NumberDisplay";
import {
  checkCallPermission,
  placeNativeCall,
  requestCallPermission,
} from "@/lib/call-service";
import { hapticLight } from "@/lib/haptics";
import {
  getLastDialed,
  getRecentNumbers,
  recordDialedNumber,
} from "@/lib/recent-numbers";
import { isValidDialNumber, normalizeDialInput, toCallableNumber } from "@/lib/phone-utils";

export function DialerScreen() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [lastDialed, setLastDialed] = useState<string | null>(null);

  const refreshRecents = useCallback(async () => {
    const [r, last] = await Promise.all([getRecentNumbers(), getLastDialed()]);
    setRecent(r);
    setLastDialed(last);
  }, []);

  useEffect(() => {
    void refreshRecents();
  }, [refreshRecents]);

  const append = useCallback((d: string) => {
    setValue((v) => normalizeDialInput(v + d));
  }, []);

  const backspace = useCallback(() => {
    void hapticLight();
    setValue((v) => v.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    void hapticLight();
    setValue("");
  }, []);

  const handleCall = useCallback(async () => {
    const normalized = normalizeDialInput(value);
    if (!isValidDialNumber(normalized)) {
      toast.error("Enter a valid number (at least 3 digits).");
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.error("Install the Android app to place calls from Quick Dialer.");
      return;
    }

    setLoading(true);
    try {
      let perm = await checkCallPermission();
      if (perm === "prompt" || perm === "prompt-with-rationale") {
        perm = await requestCallPermission();
      }
      if (perm !== "granted") {
        toast.error("Phone permission is required to place a call.", {
          description: "Enable Phone in app settings.",
        });
        return;
      }

      const callable = toCallableNumber(normalized);
      await placeNativeCall(callable);
      await recordDialedNumber(callable);
      await refreshRecents();
      toast.success("Call started", { description: callable });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start call.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [value, refreshRecents]);

  const applyNumber = useCallback((n: string) => {
    void hapticLight();
    setValue(normalizeDialInput(n));
  }, []);

  return (
    <div className="page-enter flex min-h-[100dvh] flex-col bg-[#0A0A0A] text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(59,130,246,0.12), transparent 50%), radial-gradient(80% 50% at 100% 100%, rgba(34,197,94,0.06), transparent 45%), #0A0A0A",
        }}
      />

      <header className="flex shrink-0 items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Quick Dialer</h1>
          <p className="text-xs text-[#A1A1AA]">Tap to dial · Android</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <NumberDisplay value={value} />

        <div className="flex w-full max-w-sm gap-3 self-center">
          <button
            type="button"
            onClick={backspace}
            disabled={value.length === 0 || loading}
            className="flex min-h-[3.25rem] flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#151515]/60 text-sm font-semibold text-white backdrop-blur-xl transition active:scale-[0.98] disabled:opacity-35"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={value.length === 0 || loading}
            className="flex min-h-[3.25rem] flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#151515]/60 text-sm font-semibold text-[#3B82F6] backdrop-blur-xl transition active:scale-[0.98] disabled:opacity-35"
          >
            Clear all
          </button>
        </div>

        {lastDialed && (
          <button
            type="button"
            onClick={() => applyNumber(lastDialed)}
            className="mx-auto flex max-w-sm items-center gap-2 rounded-full border border-[#22C55E]/25 bg-[#151515]/70 px-4 py-2 text-sm text-[#A1A1AA] backdrop-blur-xl transition active:scale-[0.98]"
          >
            <span className="text-[#22C55E]">Last</span>
            <span className="font-mono text-white">{lastDialed}</span>
          </button>
        )}

        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <DialPad onDigit={append} disabled={loading} />
        </div>

        {recent.length > 0 && (
          <section className="w-full max-w-md self-center">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
              Recent
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recent.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => applyNumber(num)}
                  className="shrink-0 rounded-2xl border border-white/[0.08] bg-[#151515]/65 px-4 py-3 font-mono text-sm text-white backdrop-blur-xl transition active:scale-[0.97]"
                >
                  {num}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-auto flex justify-center pt-2">
          <CallButton
            onPress={() => void handleCall()}
            loading={loading}
            disabled={false}
          />
        </div>
      </main>
    </div>
  );
}
