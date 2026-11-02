"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Check } from "@/lib/health";

/** For the site owner: shows which services are connected and exactly what to add for the rest. */
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
    <main className="setup">
      <h1>Setup check</h1>
      <p className="hint">Shows which services are connected. It only says whether each setting exists, never its value.</p>
      {err && <p className="merr">{err}</p>}
      {!data && !err && <p className="hint">Checking…</p>}
      {data && (
        <>
          <div className={"setupsum " + (data.ready ? "ok" : "bad")}>{data.ready ? "✅ Everything needed is connected. Optional extras are listed below." : "⚠️ Something required is missing. See below."} <small>Version {data.version}</small></div>
          {data.checks.map((c) => (
            <section key={c.id} className={"setupcard " + (c.ok ? "ok" : c.required ? "bad" : "warn")}>
              <h3>{c.ok ? "✅" : c.required ? "❌" : "➕"} {c.label}{c.required ? " · required" : " · optional"}</h3>
              <p>{c.detail}</p>
              {!c.ok && <p><b>What it unlocks:</b> {c.unlocks}</p>}
              {!c.ok && <p><b>How to fix:</b> {c.fix}</p>}
            </section>
          ))}
          <p className="hint">After changing settings in Vercel you must redeploy for them to take effect.</p>
        </>
      )}
      <p><Link href="/world" className="btn g">← Back to the world</Link></p>
    </main>
  );
}
