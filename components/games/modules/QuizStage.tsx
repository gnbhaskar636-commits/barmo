"use client";

import { useEffect, useState } from "react";
import type { GameStageProps } from "@/lib/games/types";

export default function QuizStage({ state, myId, onAction }: GameStageProps) {
  const v = state;
  const [picked, setPicked] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setPicked(null);
  }, [v.round]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  if (!v.q) return null;

  const answered = v.answers?.[myId] !== undefined || picked !== null;
  const dur = v.q.dur || 12000;
  // Compute remaining seconds
  const left = Math.max(0, Math.ceil((dur - 1000) / 1000));

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="quiz-stage-container" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, color: "#fff" }}>{v.q.text}</h3>
        {v.phase === "play" && (
          <div
            className="hint"
            style={{
              padding: "4px 10px",
              background: "rgba(6,182,212,0.15)",
              border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: 6,
              color: "var(--u3-cyan)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ⏱ Speed Bonus Active
          </div>
        )}
      </div>

      <div className="opts">
        {v.q.opts.map((o, i) => {
          const mine = v.answers?.[myId] ?? picked;
          const cls =
            v.phase === "reveal"
              ? i === v.correct
                ? " ok"
                : mine === i
                ? " bad"
                : ""
              : mine === i
              ? " sel"
              : "";

          return (
            <button
              key={i}
              className={"opt" + cls}
              disabled={v.phase !== "play" || answered}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                minHeight: 46,
              }}
              onClick={() => {
                setPicked(i);
                onAction({ t: "ans", i });
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.08)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {optionLabels[i]}
              </span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
