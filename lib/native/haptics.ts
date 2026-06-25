import { isNative } from "./index";

/**
 * Light haptic feedback for primary actions (habit/task toggles, etc.).
 * No-op on the web. The plugin is imported lazily so the web bundle stays lean.
 */
export async function tapHaptic(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Plugin unavailable — silently ignore.
  }
}

export async function successHaptic(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // ignore
  }
}
