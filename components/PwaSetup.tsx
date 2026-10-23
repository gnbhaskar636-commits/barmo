"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "barmo-install-dismissed";

/** Registers the service worker and shows a small "Install app" bar. */
export default function PwaSetup() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch {}
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (dismissed || installed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iPhone/iPad Safari has no install event: show a how-to hint instead.
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) setIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setEvt(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => null);
    setEvt(null);
  };

  if (!evt && !iosHint) return null;

  return (
    <div className="pwa" role="dialog" aria-label="Install BARMO">
      <span className="pwa-t">
        {evt ? "Install BARMO for quick access" : "To install: tap Share, then Add to Home Screen"}
      </span>
      {evt && <button className="btn sm" onClick={install}>Install</button>}
      <button className="btn g sm" onClick={dismiss}>Not now</button>
    </div>
  );
}
