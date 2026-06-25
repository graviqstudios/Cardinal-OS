import { Capacitor } from "@capacitor/core";

/**
 * Web↔native bridge helpers. The same site runs both in a desktop/mobile browser
 * and inside the Capacitor Android shell, so every native call must be guarded:
 * on the web these are cheap no-ops, and the heavy plugin code is dynamically
 * imported only when actually running natively.
 */

/** True only inside the native (Capacitor) shell. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** "android" | "ios" | "web". */
export function platform(): string {
  return Capacitor.getPlatform();
}
