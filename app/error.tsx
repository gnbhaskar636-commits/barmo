"use client";

import { useState } from "react";

/** Shown instead of a blank page if something crashes. Lets the visitor retry and tell the owner what happened. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [sent, setSent] = useState(false);
  const send = async () => {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "Bug", message: `Crash: ${error.message || "unknown error"}`, diag: `digest ${error.digest || "-"} · ${location.pathname} · ${navigator.userAgent.slice(0, 120)}` }),
      });
      setSent(true);
    } catch {
      /* ignore */
    }
  };
  return (
    <main className="errpage">
      <h1>Oops, something went wrong 😕</h1>
      <p>The page hit a problem. Your profile and progress are safe on this device.</p>
      <div className="acts">
        <button className="btn" onClick={reset}>Try again</button>
        <button className="btn g" onClick={() => location.reload()}>Reload the page</button>
        <button className="btn g" disabled={sent} onClick={() => void send()}>{sent ? "Thanks, report sent" : "Send an error report"}</button>
      </div>
    </main>
  );
}
