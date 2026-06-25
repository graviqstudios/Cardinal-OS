import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Cardinal OS — Android (Capacitor) shell.
 *
 * The app is a mature Next.js App Router site with server components, server
 * actions and Supabase cookie auth, so it can't be statically exported. Instead
 * the native shell loads the live hosted site in a WebView (`server.url`) and
 * layers native plugins (push, biometric, haptics, splash/status bar, share,
 * native Google sign-in) on top — that native value is also what keeps Play /
 * App review from treating it as a bare website wrapper.
 *
 * `webDir` still has to point at a real folder even in remote-URL mode: it holds
 * a tiny offline fallback page shown only when the hosted site is unreachable.
 *
 * For local testing against a LAN dev server, set CAP_SERVER_URL before
 * `npx cap sync` (e.g. http://192.168.x.x:3000) and CAP_SERVER_CLEARTEXT=true.
 */
const serverUrl = process.env.CAP_SERVER_URL ?? "https://cardinalos.graviq.in";
const cleartext = process.env.CAP_SERVER_CLEARTEXT === "true";

const config: CapacitorConfig = {
  appId: "cardinal.os",
  appName: "Cardinal OS",
  webDir: "native/www",
  server: {
    url: serverUrl,
    cleartext,
    androidScheme: "https",
  },
  android: {
    // Let the WebView background match the brand surface during load.
    backgroundColor: "#F4ECE0",
  },
  plugins: {
    SplashScreen: {
      // Auto-hide on a timer so the splash never gets stuck if the loaded page
      // doesn't call hide() (e.g. a deploy that predates the native bridge).
      // NativeBootstrap also calls hide() for a faster dismiss once painted.
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#F4ECE0",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
