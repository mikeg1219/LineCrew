import type { CapacitorConfig } from "@capacitor/cli";

const appUrl =
  process.env.CAPACITOR_APP_URL?.trim() || "https://line-crew-sigma.vercel.app";

const config: CapacitorConfig = {
  appId: "com.linecrew.app",
  appName: "LineCrew",
  webDir: "www",
  server: {
    // Fastest path for pre-launch testing: native shell loads deployed web app.
    url: appUrl,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
