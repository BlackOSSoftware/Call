import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  waMeUrl,
  intentWhatsApp,
  normalizePhoneDigits,
} from "@/utils/phone-format";

export async function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  if (url.startsWith("intent:")) {
    window.location.href = url;
    return;
  }
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, toolbarColor: "#09090B" });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function consumerWhatsAppUrl(phone: string) {
  const d = normalizePhoneDigits(phone);
  return waMeUrl(d);
}

export function businessWhatsAppIntent(phone: string) {
  const d = normalizePhoneDigits(phone);
  return intentWhatsApp(d, "com.whatsapp.w4b");
}

export function consumerSmstoIntent(phone: string) {
  const d = normalizePhoneDigits(phone);
  return intentWhatsApp(d, "com.whatsapp");
}
