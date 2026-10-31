"use client";

import { useState } from "react";
import { LESSONS, answerLocal, parseVideoUrl } from "@/lib/world/screens";
import CodeLab from "@/components/CodeLab";

export interface CinemaState { url: string; label: string; by: string; since: number }
export interface ClassState { l: number; s: number; by: string }

/**
 * What you get when you SIT at the cinema seats (Party Hall) or a workstation (AI Lab).
 * The video itself plays on the big 3D screen for everyone; here you pick what it shows.
 * In the lab you also get the AI class and the code lab. Stand up and it goes away.
 */
export default function ScreenPanel({
  mode, cinema, klass, onPlay, onSlide, onSolved,
}: {
  mode: "cinema" | "class";
  cinema: CinemaState | null;
  klass: ClassState | null;
  onPlay: (url: string | null) => void;
  onSlide: (l: number, s: number) => void;
  onSolved?: (title: string) => void;
}) {
  const [small, setSmall] = useState(false);
  const [tab, setTab] = useState<"class" | "code">("class");
  return (
    <div className={"cinema" + (small ? " small" : "")} role="region" aria-label={mode === "cinema" ? "Party cinema" : "AI lab"}>
      <div className="mhead">
        <span>{mode === "cinema" ? "🎬 Party cinema" : "🎓 AI lab"}</span>
        <button className="mmin" onClick={() => setSmall(!small)} aria-label={small ? "Expand" : "Shrink"}>{small ? "⤢" : "–"}</button>
      </div>
      {!small && mode === "class" && (
        <div className="chips">
          <button className={"chip" + (tab === "class" ? " on" : "")} onClick={() => setTab("class")}>🎓 Class</button>
          <button className={"chip" + (tab === "code" ? " on" : "")} onClick={() => setTab("code")}>💻 Code lab</button>
        </div>
      )}
      {!small && (mode === "cinema" ? <Cinema cinema={cinema} onPlay={onPlay} /> : tab === "class" ? <Class klass={klass} onSlide={onSlide} /> : <CodeLab onSolved={onSolved || (() => {})} />)}
    </div>
  );
}

/** Paste a link for the big screen. The video itself plays on the 3D screen for everyone in the room. */
export function LinkBox({ cinema, onPlay }: { cinema: CinemaState | null; onPlay: (u: string | null) => void }) {
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if (!parseVideoUrl(link)) {
      setErr("Paste a https link to a YouTube or Vimeo video, or a direct .mp4 / .webm file.");
      return;
    }
    setErr("");
    onPlay(link.trim());
    setLink("");
  };
  return (
    <div className="cbody">
      {cinema ? (
        <div className="cmeta">Now on the big screen: <b>{cinema.label}</b>, started by <b>{cinema.by}</b>.</div>
      ) : (
        <div className="cmeta">The big screen is idle.</div>
      )}
      <div className="crow">
        <input value={link} maxLength={400} placeholder="https://youtube.com/watch?v=…" aria-label="Video link" onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button className="btn sm" onClick={submit}>▶ Play</button>
        {cinema && <button className="btn g sm" onClick={() => onPlay(null)}>■ Stop</button>}
      </div>
      {err && <div className="merr">{err}</div>}
      <p className="hint">YouTube, Vimeo or a direct video link. It plays on the screen for everyone in this world. Use the video bar to pause or change volume.</p>
    </div>
  );
}

function Cinema({ cinema, onPlay }: { cinema: CinemaState | null; onPlay: (u: string | null) => void }) {
  return <LinkBox cinema={cinema} onPlay={onPlay} />;
}

function Class({ klass, onSlide }: { klass: ClassState | null; onSlide: (l: number, s: number) => void }) {
  const l = klass ? Math.min(LESSONS.length - 1, Math.max(0, klass.l)) : 0;
  const lesson = LESSONS[l];
  const s = klass ? Math.min(lesson.slides.length - 1, Math.max(0, klass.s)) : 0;
  const slide = lesson.slides[s];
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setAns("");
    let out = "";
    try {
      const r = await fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "ask", text, lines: [`Class: ${lesson.title}`, `Slide: ${slide.h}`, ...slide.pts] }),
      });
      const j = (await r.json().catch(() => ({}))) as { text?: string; source?: string };
      if (r.ok && j.text && j.source === "ai") out = j.text;
    } catch {
      /* fall back to the class notes */
    }
    setAns(out || answerLocal(text));
    setBusy(false);
  };
  return (
    <div className="cbody">
      <div className="chips">
        {LESSONS.map((x, i) => (
          <button key={x.id} className={"chip" + (i === l ? " on" : "")} onClick={() => onSlide(i, 0)}>{x.icon} {x.title}</button>
        ))}
      </div>
      <div className="slide">
        <div className="sl-n">{lesson.title} · slide {s + 1} of {lesson.slides.length}{klass ? ` · ${klass.by}` : ""}</div>
        <h4>{slide.h}</h4>
        <ul>{slide.pts.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </div>
      <div className="cact">
        <button className="btn g sm" disabled={s === 0} onClick={() => onSlide(l, s - 1)}>◀ Back</button>
        <button className="btn sm" disabled={s >= lesson.slides.length - 1} onClick={() => onSlide(l, s + 1)}>Next ▶</button>
      </div>
      <div className="crow">
        <input value={q} maxLength={300} placeholder="Ask Nova about this slide…" aria-label="Ask Nova" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void ask()} />
        <button className="btn g sm" disabled={busy} onClick={() => void ask()}>{busy ? "…" : "Ask"}</button>
      </div>
      {ans && <div className="canswer"><b>🤖 Nova:</b> {ans}</div>}
      <p className="hint">Whoever turns a slide moves the whole class.</p>
    </div>
  );
}
