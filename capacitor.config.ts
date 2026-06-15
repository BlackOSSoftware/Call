import type { CapacitorConfig } from "@capacitor/cli";

/** Live web app URL (Vercel). The Android shell loads this in the WebView. */
const LIVE_SERVER_URL = "https://call-rho-eight.vercel.app/";

const config: CapacitorConfig = {
  appId: "com.quickdialer.app",
  appName: "Lead Calling CRM",
  webDir: "out",
  android: {
    backgroundColor: "#09090B",
  },
  // Load UI from production deploy (update LIVE_SERVER_URL if your domain changes).
  server: {
    url: LIVE_SERVER_URL,
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
