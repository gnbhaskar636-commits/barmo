"use client";

import { useEffect, useState } from "react";
import { CHALLENGES, dailyChallengeId, loadSolved, runCode, saveSolved, type RunResult } from "@/lib/world/codeLab";

const DRAFT = "barmo-code-drafts";

/** A tiny real coding workbench: write JavaScript, press Run, tests check it. Runs in a sandboxed worker. */
export default function CodeLab({ onSolved }: { onSolved: (title: string) => void }) {
  const [i, setI] = useState(0);
  const ch = CHALLENGES[i];
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [solved, setSolved] = useState<string[]>([]);
  const [res, setRes] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const [review, setReview] = useState("");
  const [rbusy, setRbusy] = useState(false);

  useEffect(() => {
    setSolved(loadSolved());
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) || "{}") as Record<string, unknown>;
      const clean: Record<string, string> = {};
      Object.entries(d).forEach(([k, v]) => {
        if (typeof v === "string" && CHALLENGES.some((c) => c.id === k)) clean[k] = v.slice(0, 8000);
      });
      setDrafts(clean);
    } catch {
      /* ignore */
    }
  }, []);

  const code = drafts[ch.id] ?? ch.starter;
  const setCode = (v: string) => {
    const next = { ...drafts, [ch.id]: v.slice(0, 8000) };
    setDrafts(next);
    try {
      localStorage.setItem(DRAFT, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const pick = (n: number) => {
    setI(n);
    setRes(null);
    setHint(false);
    setReview("");
  };

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setReview("");
    const r = await runCode(code, ch);
    setRes(r);
    setBusy(false);
    const pass = !r.error && r.tests.length > 0 && r.tests.every((t) => t.ok);
    if (pass && !solved.includes(ch.id)) {
      const next = [...solved, ch.id];
      setSolved(next);
      saveSolved(next);
      onSolved(ch.title);
    }
  };

  const askReview = async () => {
    if (rbusy) return;
    setRbusy(true);
    setReview("");
    const out = res ? `Output: ${res.logs.join(" | ")}\nTests: ${res.tests.map((t) => (t.ok ? "pass" : "FAIL") + " " + t.label + (t.err ? " (" + t.err + ")" : "")).join("; ")}${res.error ? "\nError: " + res.error : ""}` : "Not run yet.";
    let text = "";
    try {
      const r = await fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "code", text: `Challenge: ${ch.title}. ${ch.brief}\nCode:\n${code.slice(0, 1000)}\n${out.slice(0, 500)}` }),
      });
      const j = (await r.json()) as { text?: string; source?: string };
      text = j.text || "";
    } catch {
      /* fall back */
    }
    setReview(text || `Hint: ${ch.hint}`);
    setRbusy(false);
  };

  const pass = !!res && !res.error && res.tests.length > 0 && res.tests.every((t) => t.ok);
  return (
    <div className="cbody codelab">
      <div className="chips">
        {CHALLENGES.map((c, n) => (
          <button key={c.id} className={"chip" + (n === i ? " on" : "")} onClick={() => pick(n)}>{solved.includes(c.id) ? "✅" : c.id === dailyChallengeId() ? "⭐" : "🔹"} {c.title}</button>
        ))}
      </div>
      <p className="hint"><b>{ch.title}{ch.id === dailyChallengeId() ? " · today's challenge ⭐" : ""}.</b> {ch.brief}</p>
      <textarea
        className="codebox"
        value={code}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="Code editor"
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const t = e.currentTarget;
            const s = t.selectionStart;
            setCode(code.slice(0, s) + "  " + code.slice(t.selectionEnd));
            requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
          } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            void run();
          }
        }}
      />
      <div className="cact">
        <button className="btn sm" disabled={busy} onClick={() => void run()}>{busy ? "Running…" : "▶ Run (Ctrl+Enter)"}</button>
        <button className="btn g sm" onClick={() => setHint(!hint)}>💡 Hint</button>
        <button className="btn g sm" disabled={rbusy} onClick={() => void askReview()}>{rbusy ? "…" : "🤖 Ask Nova to review"}</button>
        <button className="btn g sm" onClick={() => { setCode(ch.starter); setRes(null); }}>↺ Reset</button>
      </div>
      {hint && <div className="canswer">💡 {ch.hint}</div>}
      {res && (
        <div className="coderes">
          {res.error && <div className="merr">⚠️ {res.error}</div>}
          {res.logs.length > 0 && <pre className="codeout">{res.logs.join("\n")}</pre>}
          {res.tests.map((t, n) => (
            <div key={n} className={t.ok ? "tok" : "tbad"}>{t.ok ? "✅" : "❌"} {t.label}{t.err ? ` (${t.err})` : ""}</div>
          ))}
          {pass && <div className="tpass">🎉 All tests passed in {res.ms} ms. Nice work!</div>}
        </div>
      )}
      {review && <div className="canswer"><b>🤖 Nova:</b> {review}</div>}
      <p className="hint">Your code runs in a sandbox inside your browser: it can&apos;t reach the internet or this page.</p>
    </div>
  );
}
