import { Capacitor, registerPlugin } from "@capacitor/core";

export type CallPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "prompt-with-rationale"
  | "unknown";

export interface PhoneCallPlugin {
  placeCall(options: { number: string }): Promise<void>;
  checkCallPermission(): Promise<{ state: CallPermissionState }>;
  requestCallPermission(): Promise<{ state: CallPermissionState }>;
}

const PhoneCall = registerPlugin<PhoneCallPlugin>("PhoneCall", {
  web: () => ({
    async placeCall() {
      throw new Error("Native calls are only available on Android.");
    },
    async checkCallPermission() {
      return { state: "unknown" as const };
    },
    async requestCallPermission() {
      return { state: "unknown" as const };
    },
  }),
});

export async function checkCallPermission(): Promise<CallPermissionState> {
  if (!Capacitor.isNativePlatform()) return "unknown";
  try {
    const { state } = await PhoneCall.checkCallPermission();
    return state;
  } catch {
    return "unknown";
  }
}

export async function requestCallPermission(): Promise<CallPermissionState> {
  if (!Capacitor.isNativePlatform()) return "unknown";
  try {
    const { state } = await PhoneCall.requestCallPermission();
    return state;
  } catch {
    return "denied";
  }
}

export async function placeNativeCall(number: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Calls require the Android app.");
  }
  await PhoneCall.placeCall({ number });
}
