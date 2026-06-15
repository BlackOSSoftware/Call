import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const KEY = "qd_recent_numbers";
const KEY_LAST = "qd_last_dialed";
const MAX = 25;

export async function getRecentNumbers(): Promise<string[]> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return [];
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    }
  } catch {
    /* fall through */
  }
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export async function getLastDialed(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: KEY_LAST });
      return value ?? null;
    }
  } catch {
    /* fall through */
  }
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_LAST);
}

async function persistRecent(list: string[]): Promise<void> {
  const json = JSON.stringify(list);
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: KEY, value: json });
    return;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, json);
  }
}

async function persistLast(value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: KEY_LAST, value });
    return;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY_LAST, value);
  }
}

/** Record a completed dial attempt (number should be normalized). */
export async function recordDialedNumber(number: string): Promise<void> {
  const trimmed = number.trim();
  if (!trimmed) return;
  const recent = await getRecentNumbers();
  const next = [trimmed, ...recent.filter((n) => n !== trimmed)].slice(0, MAX);
  await persistRecent(next);
  await persistLast(trimmed);
}
