import { isNative, platform } from "./index";

/**
 * Register for push notifications inside the native shell: ask permission, get
 * the FCM token, and hand it to the server so it can target this device.
 * No-op on the web. Safe to call repeatedly (e.g. on each app resume / login).
 */
export async function registerPush(): Promise<void> {
  if (!isNative()) return;
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
        // Network hiccup — it'll re-register on next launch.
      }
    });

    await PushNotifications.register();
  } catch {
    // Plugin unavailable — ignore.
  }
}
