import { isNative } from "./index";

/**
 * Native share sheet when in the app; falls back to the Web Share API in a
 * mobile browser, and silently does nothing where neither exists.
 */
export async function shareText(opts: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<void> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share(opts);
      return;
    } catch {
      // fall through to web
    }
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(opts);
    } catch {
      // user cancelled or unsupported — ignore
    }
  }
}
