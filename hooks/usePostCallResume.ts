"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { useCrmStore } from "@/store/useCrmStore";

/**
 * When returning from the phone app after ACTION_CALL, open post-call UI if a lead is pending.
 */
export function usePostCallResume(onShowOutcome: () => void) {
  const pending = useCrmStore((s) => s.pendingPostCall);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: { remove: () => Promise<void> } | undefined;

    void App.addListener("resume", () => {
      if (pendingRef.current?.leadId) {
        onShowOutcome();
      }
    }).then((s) => {
      sub = s;
    });

    return () => {
      void sub?.remove();
    };
  }, [onShowOutcome]);
}
