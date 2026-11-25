"use client";

import type { GameStageProps } from "@/lib/games/types";

export default function DiceStage({ state, myId, onAction }: GameStageProps) {
  const v = state;
  const players = Object.values(v.players || {});
  const myRoll = v.rolls?.[myId];

  return (
    <div className="dice-stage-container" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="dice">
        {players.map((p) => {
          const rollVal = v.rolls?.[p.id];
          const mult = v.multipliers?.[p.id];
          const isMe = p.id === myId;
          return (
            <div
              key={p.id}
              className={"die" + (isMe ? " me" : "")}
              style={
                isMe
                  ? { borderColor: "var(--u3-cyan)", background: "rgba(6,182,212,0.12)" }
                  : undefined
              }
            >
              <small>{p.name}{isMe ? " (You)" : ""}</small>
              <b style={{ fontSize: 28 }}>{rollVal ?? "?"}</b>
              {v.phase === "reveal" && mult && mult > 1 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.2)",
                    padding: "2px 6px",
                    borderRadius: 4,
                    marginTop: 4,
                  }}
                >
                  ⚡ {mult}x MULTIPLIER
                </span>
              )}
            </div>
          );
        })}
      </div>

      {v.phase === "play" && !myRoll && (
        <button
          className="btn big"
          style={{ minHeight: 48, fontWeight: 800, fontSize: 16 }}
          onClick={() => onAction({ t: "roll" })}
        >
          🎲 Roll Quantum Core
        </button>
      )}

      {v.phase === "play" && myRoll && (
        <p className="hint" style={{ color: "var(--u3-cyan)" }}>
          ⚡ Quantum core calibrated ({myRoll}) · Waiting for rivals…
        </p>
      )}
    </div>
  );
}
