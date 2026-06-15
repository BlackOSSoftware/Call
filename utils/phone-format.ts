/** Digits only for storage and wa.me */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function waMeUrl(digits: string): string {
  const d = normalizePhoneDigits(digits);
  if (!d) return "";
  return `https://wa.me/${d}`;
}

export function intentWhatsApp(digits: string, packageName: string): string {
  const d = normalizePhoneDigits(digits);
  return `intent://send/${d}#Intent;scheme=smsto;package=${packageName};end`;
}
