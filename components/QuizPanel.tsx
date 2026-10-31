"use client";

import { useEffect, useRef, useState } from "react";
import { CATS, Q_TIME, phaseAt, scores, type Answers, type QuizState } from "@/lib/world/quiz";

const LETTERS = ["A", "B", "C", "D"];

/** The trivia night overlay. Everyone in the world sees the same question at the same moment. */
export default function QuizPanel({
  st, ans, names, myId, onAnswer, onStop, onFinish,
}: {
  st: QuizState;
  ans: Answers;
  names: Record<string, string>;
  myId: string;
  onAnswer: (q: number, choice: number) => void;
  onStop: () => void;
  onFinish: (rank: number, players: number, pts: number, answered: boolean) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [small, setSmall] = useState(false);
  const finished = useRef(0);
  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(i);
  }, []);
  const ph = phaseAt(st, now);
  const board = scores(st, ans, names);

  useEffect(() => {
    if (ph.phase !== "done" || finished.current === st.t0) return;
    finished.current = st.t0;
    const idx = board.findIndex((b) => b.id === myId);
    onFinish(idx < 0 ? 0 : idx + 1, board.length, idx < 0 ? 0 : board[idx].pts, !!ans[myId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ph.phase]);

  const q = st.qs[Math.min(ph.i, st.qs.length - 1)];
  const mine = ans[myId]?.[ph.i];
  const who = (i: number) => Object.keys(ans).filter((id) => ans[id]?.[i]?.c === st.qs[i].a).map((id) => names[id] || "Player");

  return (
    <div className={"cinema quizpanel" + (small ? " small" : "")} role="region" aria-label="Trivia night" aria-live="polite">
      <div className="mhead">
        <span>🧠 Trivia night · {CATS[st.cat] || "Mixed"} · hosted by {st.by}</span>
        <span className="shbtns">
          <button className="mmin" onClick={() => setSmall(!small)} aria-label={small ? "Expand" : "Shrink"}>{small ? "⤢" : "–"}</button>
          <button className="mmin" onClick={onStop} aria-label="End the trivia night for everyone" title="End for everyone">■</button>
        </span>
      </div>
      {!small && (
        <div className="cbody">
          {ph.phase === "lobby" && <p className="quizbig">Get ready… starting in {Math.ceil(ph.msLeft / 1000)}</p>}
          {(ph.phase === "question" || ph.phase === "reveal") && (
            <>
              <div className="quizbar" aria-hidden="true"><i style={{ width: (ph.phase === "question" ? (ph.msLeft / Q_TIME) * 100 : 0) + "%" }} /></div>
              <div className="sl-n">Question {ph.i + 1} of {st.qs.length}{ph.phase === "question" ? ` · ${Math.ceil(ph.msLeft / 1000)}s` : ""}</div>
              <h4 className="quizq">{q.q}</h4>
              <div className="quizopts">
                {q.o.map((o, c) => {
                  const right = ph.phase === "reveal" && c === q.a;
                  const wrong = ph.phase === "reveal" && mine?.c === c && c !== q.a;
                  return (
                    <button
                      key={c}
                      className={"qopt" + (mine?.c === c ? " mine" : "") + (right ? " right" : "") + (wrong ? " wrong" : "")}
                      disabled={ph.phase !== "question" || !!mine}
                      onClick={() => onAnswer(ph.i, c)}
                    >
                      <b>{LETTERS[c]}</b> {o}
                    </button>
                  );
                })}
              </div>
              {ph.phase === "question" && <div className="cmeta">{mine ? "Locked in. Waiting for the others…" : "Answer fast: quicker answers score more."}</div>}
              {ph.phase === "reveal" && (
                <div className="cmeta">{mine ? (mine.c === q.a ? "✅ Correct!" : "❌ Not this time.") : "You did not answer."} Got it right: {who(ph.i).join(", ") || "nobody"}</div>
              )}
            </>
          )}
          {(ph.phase === "reveal" || ph.phase === "done") && board.length > 0 && (
            <ol className="quizboard">
              {board.slice(0, ph.phase === "done" ? 6 : 3).map((b, i) => (
                <li key={b.id} className={b.id === myId ? "me" : ""}>{["🥇", "🥈", "🥉"][i] || i + 1 + "."} <b>{b.name}</b> <span>{b.pts} pts · {b.right} right</span></li>
              ))}
            </ol>
          )}
          {ph.phase === "done" && <p className="quizbig">{board[0] ? `🏆 ${board[0].name} wins!` : "Nobody answered this time."}</p>}
        </div>
      )}
    </div>
  );
}
