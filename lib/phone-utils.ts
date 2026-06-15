/** Normalize dial string for display and storage (keeps + and digits, # *). */
export function normalizeDialInput(raw: string): string {
  return raw.replace(/[^\d+#*+]/g, "");
}

export function isValidDialNumber(value: string): boolean {
  const n = normalizeDialInput(value);
  if (n.length < 3) return false;
  return /[\d+#*]/.test(n);
}

/** E.164-ish or local dial string for tel: / native call (digits, +, #, *). */
export function toCallableNumber(value: string): string {
  return normalizeDialInput(value);
}
