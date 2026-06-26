"use client";

import * as React from "react";

/** The `beforeinstallprompt` event isn't in the standard lib DOM types. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * "Install app" entry point for the landing page. Drives the real PWA install
 * flow on Chrome/Android/desktop via `beforeinstallprompt`, and falls back to a
 * short instruction sheet on iOS Safari (which has no programmatic install) and
 * any other browser. Hides itself once the app is already installed.
 */
export function InstallAppButton({
  className,
  style,
  label = "Install app",
}: {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [sheet, setSheet] = React.useState<null | "ios" | "generic">(null);

  React.useEffect(() => {
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's mini-infobar; we trigger it ourselves
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setSheet(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setSheet(isIOS() ? "ios" : "generic");
  }

  // Already installed → nothing to offer.
  if (installed) return null;

  return (
    <>
      <button type="button" onClick={onClick} className={className} style={style}>
        <DownloadIcon />
        {label}
      </button>

      {sheet && <InstallSheet kind={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

function InstallSheet({ kind, onClose }: { kind: "ios" | "generic"; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps =
    kind === "ios"
      ? [
          "Open this page in Safari.",
          "Tap the Share button (the square with an arrow).",
          "Choose “Add to Home Screen”.",
          "Tap Add — Cardinal will appear like a native app.",
        ]
      : [
          "Open your browser menu (⋮ or ⋯).",
          "Choose “Install app” or “Add to Home screen”.",
          "Confirm — Cardinal opens in its own window.",
        ];

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-[rgba(8,5,3,0.8)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] rounded-[20px] border border-[rgba(242,233,219,0.12)] bg-[#1A140F] p-7 text-[#F2E9DB] shadow-[0_40px_90px_rgba(0,0,0,0.6)]">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-[9px] border border-[rgba(242,233,219,0.12)] bg-[#241C15] text-[#B6A892]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C97A63]">Install Cardinal</div>
        <h2 className="mt-2.5 font-serif text-2xl font-normal leading-tight">Add it to your home screen</h2>
        <ol className="mt-5 flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#D7CCBA]">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: "var(--co-accent, #CB4B33)" }}>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-5 text-[13px] leading-relaxed text-[#897C68]">No app store, no download size — it installs straight from the web and updates itself.</p>
      </div>
    </div>
  );
}
