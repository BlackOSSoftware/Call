"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  businessWhatsAppIntent,
  consumerWhatsAppDeepLink,
  consumerWhatsAppIntent,
  consumerWhatsAppUrl,
  openExternalUrl,
} from "@/lib/native-links";
import { hapticLight } from "@/lib/haptics";

type Props = {
  open: boolean;
  phone: string;
  onClose: () => void;
};

export function WhatsAppSheet({ open, phone, onClose }: Props) {
  const openConsumer = () => {
    void hapticLight();
    const direct = consumerWhatsAppDeepLink(phone);
    if (!direct) {
      onClose();
      return;
    }
    if (Capacitor.isNativePlatform()) {
      // Opens WhatsApp app chat directly (Custom Tabs / wa.me in WebView often do not).
      window.location.href = direct;
      onClose();
      return;
    }
    void openExternalUrl(consumerWhatsAppUrl(phone)).finally(() => onClose());
  };

  const openBusiness = () => {
    void hapticLight();
    if (Capacitor.isNativePlatform()) {
      const intent = businessWhatsAppIntent(phone);
      if (intent) {
        window.location.href = intent;
        onClose();
        return;
      }
      const fallback = consumerWhatsAppIntent(phone);
      if (fallback) {
        window.location.href = fallback;
        onClose();
        return;
      }
    }
    void openExternalUrl(consumerWhatsAppUrl(phone)).finally(() => onClose());
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#18181B] shadow-2xl"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <p className="text-sm font-semibold text-white">Open WhatsApp</p>
              <button
                type="button"
                aria-label="Close"
                className="rounded-full p-2 text-[#A1A1AA]"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-2 p-4">
              <button
                type="button"
                className="rounded-2xl bg-[#22C55E] py-3.5 text-sm font-semibold text-black transition active:scale-[0.99]"
                onClick={openConsumer}
              >
                WhatsApp
              </button>
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-[#27272A] py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]"
                onClick={openBusiness}
              >
                WhatsApp Business
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
