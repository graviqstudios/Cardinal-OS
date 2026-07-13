import { isNative, platform } from "./index";

/**
 * Push is only safe to register once Firebase is configured in the app build
 * (google-services.json present). Without it, the native register() throws
 * "Default FirebaseApp is not initialized" and crashes the app - which a JS
 * try/catch cannot stop. So registration is gated behind this flag, which the
 * user sets to "true" in Vercel only after adding google-services.json and
 * rebuilding the APK.
 */
const PUSH_ENABLED = process.env.NEXT_PUBLIC_PUSH_ENABLED === "true";

/**
 * Register for push notifications inside the native shell: ask permission, get
 * the FCM token, and hand it to the server so it can target this device.
 * No-op on the web or until push is enabled. Safe to call repeatedly.
 */
export async function registerPush(): Promise<void> {
  if (!isNative() || !PUSH_ENABLED) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let receive = perm.receive;
    if (receive === "prompt" || receive === "prompt-with-rationale") {
      receive = (await PushNotifications.requestPermissions()).receive;
    }
    if (receive !== "granted") return;

    // Send the token to our backend once it's issued.
    await PushNotifications.addListener("registration", async (token) => {
      try {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform: platform() }),
        });
      } catch {
        // Network hiccup - it'll re-register on next launch.
      }
    });

    await PushNotifications.register();
  } catch {
    // Plugin unavailable - ignore.
  }
}
