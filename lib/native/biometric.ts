import { isNative } from "./index";

/**
 * Biometric / device-passcode app lock for the Android shell.
 *
 * The "lock enabled" choice is a device-local setting (localStorage), since it's
 * about this physical device, not the account. All calls no-op safely on the web.
 */

const LOCK_KEY = "cardinal.biometricLock";

export function isBiometricLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LOCK_KEY) === "1";
}

export function setBiometricLockEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) window.localStorage.setItem(LOCK_KEY, "1");
  else window.localStorage.removeItem(LOCK_KEY);
}

/** Whether this device has biometrics (or a device credential) available. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    const result = await NativeBiometric.isAvailable({ useFallback: true });
    return Boolean(result.isAvailable);
  } catch {
    return false;
  }
}

/**
 * Prompt for biometric / passcode confirmation. Resolves true on success, false
 * on cancel/failure. `useFallback` lets the user fall back to the device PIN.
 */
export async function verifyIdentity(reason = "Unlock Cardinal OS"): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Cardinal OS",
      subtitle: reason,
      useFallback: true,
      maxAttempts: 3,
    });
    return true;
  } catch {
    return false;
  }
}
