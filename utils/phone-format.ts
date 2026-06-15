/** Digits only for storage and wa.me */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function waMeUrl(digits: string): string {
  const d = normalizePhoneDigits(digits);
  if (!d) return "";
  return `https://wa.me/${d}`;
}

/** Opens the WhatsApp app chat composer (full international number, digits only, no +). */
export function whatsappSendDeepLink(input: string): string {
  const d = normalizePhoneDigits(input);
  if (!d) return "";
  return `whatsapp://send?phone=${d}`;
}

/**
 * Android intent targeting WhatsApp / WhatsApp Business (smsto + SENDTO).
 * Falls back when deep links are handled poorly on some WebViews.
 */
export function intentWhatsApp(digits: string, packageName: string): string {
  const d = normalizePhoneDigits(digits);
  if (!d) return "";
  return `intent://send/${d}#Intent;scheme=smsto;package=${packageName};action=android.intent.action.SENDTO;end`;
}
