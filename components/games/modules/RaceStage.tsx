"use client";

import { Dot } from "@/components/app/Avatar";
import type { GameStageProps } from "@/lib/games/types";

export default function RaceStage({ state, myId, onAction }: GameStageProps) {
  const v = state;
  const players = Object.values(v.players || {});
  const tapped = v.taps?.includes(myId) || v.early?.includes(myId);

  return (
    <div className="u3-raceway-container">
      {/* Raceway Track Stage with live competitor lanes */}
      <div className="u3-raceway-track-stage">
        <div className="u3-raceway-grid-lines" />
        <div className="u3-raceway-markers">
          <span>0% [GRID DEPLOY]</span>
          <span>50% [QUANTUM GATE]</span>
          <span>100% [WARP HORIZON]</span>
        </div>

        <div className="u3-raceway-lanes">
          {players.map((p, idx) => {
            const isMe = p.id === myId;
            const hasTapped = v.taps?.includes(p.id);
            const isEarly = v.early?.includes(p.id);
            const isNitro = v.nitro?.[p.id];
            const draftedBy = v.slips?.[p.id];

            // Calculate visual position along the track
            let pos = 6;
            if (v.phase === "reveal") {
              const tapRank = v.taps?.indexOf(p.id) ?? -1;
              if (tapRank === 0) pos = 94;
              else if (tapRank === 1) pos = 80;
              else if (tapRank === 2) pos = 68;
              else if (tapRank > 2) pos = 55;
              else if (isEarly) pos = 14;
              else pos = 22;
            } else if (v.phase === "play") {
              if (hasTapped) pos = 92;
              else if (isEarly) pos = 14;
              else if (v.rs === "go") pos = 42;
              else pos = 6;
            }

            const speederIcons = ["🏎️", "⚡", "🚀", "🛸", "🏍️"];
            const speederIcon = speederIcons[idx % speederIcons.length];

            return (
              <div key={p.id} className={`u3-raceway-lane-row ${isMe ? "me" : ""}`}>
                <div className="u3-raceway-pilot-tag">
                  <Dot av={p.av} name={p.name} size={24} top={p.top} />
                  <span>{p.name}</span>
                  {isMe && <small style={{ color: "var(--u3-cyan)" }}>[YOU]</small>}
                </div>

                <div className="u3-raceway-track-lane">
                  <div
                    className="u3-raceway-speeder-node"
                    style={{
                      left: `${pos}%`,
                      color: isMe ? "var(--u3-cyan)" : "var(--u3-accent)",
                    }}
                  >
                    <div
                      className="u3-speeder-trail"
                      style={{
                        width: pos > 40 ? 54 : 20,
                        background: isNitro
                          ? "linear-gradient(90deg, transparent, #ec4899, #8b5cf6)"
                          : undefined,
                      }}
                    />
                    <span className="u3-speeder-glyph">{speederIcon}</span>
                    {isNitro && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          background: "rgba(236,72,153,0.3)",
                          color: "#f472b6",
                          padding: "1px 5px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        NITRO CRIT!
                      </span>
                    )}
                    {draftedBy && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          background: "rgba(6,182,212,0.3)",
                          color: "var(--u3-cyan)",
                          padding: "1px 5px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⚡ DRAFTING {draftedBy}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tactical Reactor Core Trigger Button */}
      <button
        className={`u3-raceway-reactor-trigger ${
          v.phase === "reveal"
            ? "done"
            : tapped
            ? v.early?.includes(myId)
              ? "early"
              : "tapped"
            : v.rs === "go"
            ? "go"
            : "wait"
        }`}
        disabled={v.phase !== "play" || !!tapped}
        onClick={() => onAction({ t: "tap" })}
      >
        {v.phase === "reveal" ? (
          <span>🏁 ROUND TELEMETRY LOGGED</span>
        ) : tapped ? (
          v.early?.includes(myId) ? (
            <>
              <span style={{ color: "#fb7185" }}>⚠️ TACHYON CORE OVERHEAT (FALSE START!)</span>
              <small style={{ fontSize: 13, opacity: 0.8 }}>Shield breach penalty · 0 PTS</small>
            </>
          ) : (
            <>
              <span style={{ color: "var(--u3-cyan)" }}>⚡ WARP DRIVE ENGAGED: {v.times?.[myId] ?? "..."} ms</span>
              <small style={{ fontSize: 13, opacity: 0.9 }}>
                {v.speeds?.[myId] || "Hyperspace breach achieved · Waiting for rivals"}
              </small>
            </>
          )
        ) : v.rs === "go" ? (
          <>
            <span style={{ color: "#fff", textShadow: "0 0 12px #06b6d4" }}>⚡ ENGAGE WARP DRIVE (TAP NOW!) ⚡</span>
            <small style={{ fontSize: 13, color: "var(--u3-cyan)", fontWeight: 700 }}>
              SUB-160MS PRODUCES SUPER-SONIC NITRO CRITICAL!
            </small>
          </>
        ) : (
          <>
            <span style={{ color: "var(--u3-gold)" }}>⏳ CHARGING TACHYON FLUX...</span>
            <small style={{ fontSize: 13, color: "var(--u3-muted)", fontWeight: 600 }}>
              Keep thumb locked · Gate flares any microsecond
            </small>
          </>
        )}
      </button>

      {/* Live Telemetry Readout */}
      {v.phase === "reveal" && v.times && (
        <div className="u3-raceway-telemetry-grid">
          {(v.taps || []).map((id, rank) => {
            const p = v.players[id];
            const ms = v.times![id];
            const spd = v.speeds?.[id] || "Mach 3.2";
            const isTop = rank === 0;
            return (
              <div
                key={id}
                className="u3-telemetry-card"
                style={isTop ? { borderColor: "rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)" } : {}}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 900, color: isTop ? "#fbbf24" : "var(--u3-cyan)" }}>
                    #{rank + 1}
                  </span>
                  <b style={{ color: "#fff", fontSize: 13 }}>{p?.name || "Racer"}</b>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--u3-cyan)" }}>{ms} ms</div>
                  <div style={{ fontSize: 11, color: "var(--u3-muted)" }}>{spd}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
