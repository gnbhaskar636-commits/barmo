"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Check } from "@/lib/health";
import { BRAND } from "@/lib/brand.config";

export default function SetupPage() {
  const [data, setData] = useState<{ version: string; ready: boolean; checks: Check[] } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr("Could not load the setup check."));
  }, []);

  return (
    <main className="setuppage u3-setup-page-layout">
      <div className="u3-setup-hero">
        <div className="u3-spatial-badge">
          <span className="u3-badge-icon">⚙️</span>
          <span>SYSTEM DIAGNOSTICS & TELEMETRY</span>
        </div>
        <h1>BARMO {BRAND.edition} Infrastructure</h1>
        <p className="hint">
          Real-time verification of Supabase Realtime, LiveKit SFU, AI Nova APIs, and Webhooks. No secret tokens are ever displayed.
        </p>
      </div>

      {err && <div className="note u3-note-bad">{err}</div>}
      {!data && !err && <p className="hint u3-loading-text">Querying diagnostic probes...</p>}

      {data && (
        <div className="u3-setup-content">
          <div className={"setupsum u3-summary-card " + (data.ready ? "ok" : "bad")}>
            <div className="u3-sum-header">
              <span className="u3-sum-icon">{data.ready ? "🟢" : "🟡"}</span>
              <div>
                <b>{data.ready ? "Universe 3.0 Ready for Deployment" : "Configuration Action Recommended"}</b>
                <p>
                  {data.ready
                    ? "Core services are verified and operational. Optional integrations are listed below."
                    : "Some services need environment keys for full cloud synchronization. Local guest mode remains active."}
                </p>
              </div>
            </div>
            <small className="u3-version-badge">Engine Build: v{data.version}</small>
          </div>

          <div className="u3-checks-grid">
            {data.checks.map((c) => (
              <section key={c.id} className={"setupcard u3-diag-card " + (c.ok ? "ok" : c.required ? "bad" : "warn")}>
                <div className="u3-diag-header">
                  <span className="u3-diag-icon">{c.ok ? "✓" : c.required ? "✕" : "＋"}</span>
                  <div>
                    <h3>{c.label}</h3>
                    <span className={`u3-status-pill ${c.ok ? "ok" : "missing"}`}>
                      {c.ok ? "Active & Linked" : c.required ? "Required" : "Optional"}
                    </span>
                  </div>
                </div>

                <p className="u3-diag-detail">{c.detail}</p>
                {!c.ok && (
                  <div className="u3-diag-action-box">
                    <p><b>Unlocks:</b> {c.unlocks}</p>
                    <p><b>Configuration:</b> <code>{c.fix}</code></p>
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="u3-setup-footer">
            <p className="hint">
              After adding environment variables in Vercel or your hosting provider, trigger a deployment to activate them.
            </p>
            <div className="row">
              <Link href="/world" className="btn u3-btn-primary">
                Launch 3D Universe →
              </Link>
              <Link href="/" className="btn g">
                Return to Hub
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
