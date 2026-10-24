"use client";

import { useMemo, useState } from "react";
import { LESSONS, answerLocal, parseVideoUrl } from "@/lib/world/screens";

export interface CinemaState { url: string; label: string; by: string; since: number }
export interface ClassState { l: number; s: number; by: string }

/**
 * The shared screen you get when you SIT: the Party Hall cinema (paste a link, everyone seated watches)
 * and the AI Lab class (lesson slides plus "Ask Nova"). Stand up and it goes away.
 */
export default function ScreenPanel({
  mode, cinema, klass, onPlay, onSlide,
}: {
  mode: "cinema" | "class";
  cinema: CinemaState | null;
  klass: ClassState | null;
  onPlay: (url: string | null) => void;
  onSlide: (l: number, s: number) => void;
}) {
  const [small, setSmall] = useState(false);
  return (
    <div className={"cinema" + (small ? " small" : "")} role="region" aria-label={mode === "cinema" ? "Party cinema" : "AI class"}>
      <div className="mhead">
        <span>{mode === "cinema" ? "🎬 Party cinema" : "🎓 AI class"}</span>
        <button className="mmin" onClick={() => setSmall(!small)} aria-label={small ? "Expand" : "Shrink"}>{small ? "⤢" : "–"}</button>
      </div>
      {!small && (mode === "cinema" ? <Cinema cinema={cinema} onPlay={onPlay} /> : <Class klass={klass} onSlide={onSlide} />)}
    </div>
  );
}

function Cinema({ cinema, onPlay }: { cinema: CinemaState | null; onPlay: (u: string | null) => void }) {
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const [changing, setChanging] = useState(false);
  // Compute the start point once per video so the player is not reloaded on every re-render.
  const v = useMemo(
    () => (cinema ? parseVideoUrl(cinema.url, (Date.now() - cinema.since) / 1000) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cinema?.url, cinema?.since]
  );
  const submit = () => {
    if (!parseVideoUrl(link)) {
      setErr("Paste a https link to a YouTube or Vimeo video, or a direct .mp4 / .webm file.");
      return;
    }
    setErr("");
    onPlay(link.trim());
    setLink("");
    setChanging(false);
  };
  return (
    <div className="cbody">
      {v && cinema ? (
        <>
          <div className="cframe">
            {v.kind === "embed" ? (
              <iframe
                key={cinema.since}
                src={v.src}
                title={v.label}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <video key={cinema.since} src={v.src} controls autoPlay playsInline />
            )}
          </div>
          <div className="cmeta">
            <span>Started by <b>{cinema.by}</b> · {v.label}. Press play if it does not start by itself.</span>
          </div>
          <div className="cact">
            <button className="btn g sm" onClick={() => setChanging(!changing)}>{changing ? "Cancel" : "Change video"}</button>
            <button className="btn g sm" onClick={() => onPlay(null)}>■ Stop for everyone</button>
          </div>
        </>
      ) : (
        <p className="hint">Nothing is playing. Paste a link and everyone seated in the cinema watches together.</p>
      )}
      {(!cinema || changing) && (
        <div className="crow">
          <input value={link} maxLength={400} placeholder="https://youtube.com/watch?v=…" aria-label="Video link" onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button className="btn sm" onClick={submit}>▶ Play</button>
        </div>
      )}
      {err && <div className="merr">{err}</div>}
      <p className="hint">Only YouTube, Vimeo and direct video links work. Each person can pause or seek in their own player.</p>
    </div>
  );
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
