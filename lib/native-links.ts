import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  waMeUrl,
  intentWhatsApp,
  normalizePhoneDigits,
  whatsappSendDeepLink,
} from "@/utils/phone-format";

export async function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  // Hand off to installed apps / intent resolver — do not use in-app Browser (breaks WA chat).
  if (url.startsWith("intent:") || url.startsWith("whatsapp:")) {
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

/** Consumer WhatsApp app deep link (native). */
export function consumerWhatsAppDeepLink(phone: string): string {
  return whatsappSendDeepLink(phone);
}

export function businessWhatsAppIntent(phone: string) {
  const d = normalizePhoneDigits(phone);
  return intentWhatsApp(d, "com.whatsapp.w4b");
}

export function consumerWhatsAppIntent(phone: string) {
  const d = normalizePhoneDigits(phone);
  return intentWhatsApp(d, "com.whatsapp");
}
