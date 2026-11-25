"use client";

import { useEffect, useRef, useState } from "react";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { useGame } from "@/components/games/useGame";
import { GAMES, type GameId } from "@/lib/games/types";
import type { Pub } from "@/lib/social/store";
import DiceStage from "@/components/games/modules/DiceStage";
import QuizStage from "@/components/games/modules/QuizStage";
import RaceStage from "@/components/games/modules/RaceStage";
import MemoryStage from "@/components/games/modules/MemoryStage";
import CyberCodeStage from "@/components/games/modules/CyberCodeStage";
import { recordMatchCompletion, type MatchReward } from "@/lib/progression";
import {
  extractMatchTelemetry,
  generateNovaMatchSummary,
  type NovaMatchSummary,
} from "@/lib/world/novaCompanion";
import NovaCoachDrawer from "@/components/companion/NovaCoachDrawer";

const TEAM_CONFIG: Record<"neon" | "cyber" | "sol", { label: string; color: string; bg: string; border: string }> = {
  neon: { label: "NEON", color: "#06b6d4", bg: "rgba(6,182,212,0.15)", border: "rgba(6,182,212,0.4)" },
  cyber: { label: "CYBER", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.4)" },
  sol: { label: "SOL", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)" },
};

export default function GameRoom({
  code,
  host,
  initial,
  me,
  onLeave,
  role = "player",
  tournamentContext,
}: {
  code: string;
  host: boolean;
  initial: GameId;
  me: Pub;
  onLeave: () => void;
  role?: "player" | "spectator";
  tournamentContext?: { tournamentId: string; matchId: string; round: number };
}) {
  const toast = useToast();
  const hub = useHub();
  const g = useGame(code, me, host, initial, role, tournamentContext);
  const v = g.view;
  const recordedRef = useRef<string | null>(null);
  const [matchReward, setMatchReward] = useState<MatchReward | null>(null);
  const [novaSummary, setNovaSummary] = useState<NovaMatchSummary | null>(null);
  const [showCoach, setShowCoach] = useState(false);

  useEffect(() => {
    if (v?.phase === "play" || v?.phase === "over") hub.complete("game");
    if (v?.phase === "over") {
      if (v.winners?.includes(me.id)) hub.complete("win");

      const matchKey = `${code}_${v.game}_${v.round || 1}`;
      if (recordedRef.current !== matchKey) {
        recordedRef.current = matchKey;
        const isWinner = !!v.winners?.includes(me.id);
        const totalPlayers = Object.keys(v.players || {}).length || 2;
        const myScore = v.players?.[me.id]?.score || 0;
        const sortedIds = Object.keys(v.players || {}).sort((a, b) => (v.players[b]?.score || 0) - (v.players[a]?.score || 0));
        const placement = Math.max(1, sortedIds.indexOf(me.id) + 1);

        const res = recordMatchCompletion(
          v.game,
          placement,
          totalPlayers,
          myScore,
          isWinner
        );
        setMatchReward(res.reward);

        const telemetry = extractMatchTelemetry(v, me.id);
        const summary = generateNovaMatchSummary(telemetry);
        setNovaSummary(summary);
      }
    } else if (v?.phase === "play") {
      recordedRef.current = null;
      setMatchReward(null);
      setNovaSummary(null);
    }
  }, [v?.phase, v?.round, v?.game]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast("Room code copied: " + code);
    } catch {
      toast("Room code: " + code);
    }
  };

  const copyInviteLink = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/games?join=${code}`;
      await navigator.clipboard.writeText(url);
      toast("Invite link copied: " + url);
    } catch {
      toast("Room code: " + code);
    }
  };

  if (!v) {
    return (
      <div className="card">
        <p className="hint">{g.connected ? "Waiting for the host…" : "Connecting…"}</p>
        <button className="btn g" onClick={onLeave}>
          Leave
        </button>
      </div>
    );
  }

  const players = Object.values(v.players).sort((a, b) => b.score - a.score);
  const activePlayers = players.filter((p) => p.role !== "spectator");
  const spectators = players.filter((p) => p.role === "spectator");
  const info = GAMES.find((x) => x.id === v.game)!;
  const myPlayer = v.players[me.id];
  const isSpectator = myPlayer?.role === "spectator";

  // Ready check calculation
  const activeNonBots = activePlayers.filter((p) => !p.id.startsWith("bot_"));
  const unreadyPlayers = activeNonBots.filter((p) => !p.ready);
  const allReady = activeNonBots.length <= 1 || unreadyPlayers.length === 0;

  return (
    <div className="gameroom">
      <div className="dmhead" style={{ flexWrap: "wrap", gap: 8 }}>
        <b>
          {info.icon} {info.name}
        </b>
        <span className="hint">Room {code}</span>
        {v.tournamentContext && (
          <span style={{ fontSize: 11, background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>
            🏆 TOURNAMENT ROUND {v.tournamentContext.round}
          </span>
        )}
        <span className="sp" />
        <button className="btn g sm" onClick={copyInviteLink}>
          🔗 Share Link
        </button>
        <button className="btn g sm" onClick={copy}>
          Copy code
        </button>
        <button className="btn g sm" onClick={onLeave}>
          Leave
        </button>
      </div>

      {g.hostGone && (
        <div className="note">The host seems to have left. You can leave and start a new room.</div>
      )}

      {/* Lobby HUD Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--u3-text, #fff)" }}>
            👥 {activePlayers.length} Active Player{activePlayers.length === 1 ? "" : "s"}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: allReady ? "#10b981" : "#f59e0b",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {allReady ? "✓ All Players Ready" : `⏳ Ready: ${v.readyCount || 0}/${activePlayers.length}`}
          </span>
          <span style={{ fontSize: 12, color: "var(--u3-cyan, #06b6d4)", fontWeight: 600 }}>
            👁️ {v.spectatorCount || spectators.length} Spectator{(v.spectatorCount || spectators.length) === 1 ? "" : "s"}
          </span>
        </div>

        {/* Player Personal Lobby Controls */}
        {v.phase === "lobby" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {!isSpectator ? (
              <>
                {/* Team Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--u3-text-dim, #888)", fontWeight: 700 }}>TEAM:</span>
                  {(["neon", "cyber", "sol"] as const).map((t) => {
                    const cfg = TEAM_CONFIG[t];
                    const active = (myPlayer?.team || "neon") === t;
                    return (
                      <button
                        key={t}
                        onClick={() => g.setTeam(t)}
                        style={{
                          background: active ? cfg.bg : "transparent",
                          borderColor: active ? cfg.color : "rgba(255,255,255,0.15)",
                          color: active ? cfg.color : "var(--u3-text-dim, #888)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>

                {/* Ready Check Toggle Button */}
                <button
                  className="btn sm"
                  onClick={() => g.toggleReady(!myPlayer?.ready)}
                  style={{
                    background: myPlayer?.ready
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "rgba(245,158,11,0.2)",
                    borderColor: myPlayer?.ready ? "#10b981" : "#f59e0b",
                    color: myPlayer?.ready ? "#fff" : "#f59e0b",
                    fontWeight: 700,
                    padding: "4px 12px",
                  }}
                >
                  {myPlayer?.ready ? "✓ READY" : "⏳ READY UP"}
                </button>

                <button
                  className="btn g sm"
                  onClick={() => g.setRole("spectator")}
                  title="Switch to spectator role"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  👁️ Spectate
                </button>
              </>
            ) : (
              <button
                className="btn g sm"
                onClick={() => g.setRole("player")}
                style={{ fontSize: 11, padding: "4px 12px", color: "#10b981", borderColor: "#10b981" }}
              >
                🎮 Join as Player
              </button>
            )}
          </div>
        )}
      </div>

      {/* Spectator Live Banner during active match */}
      {isSpectator && v.phase !== "lobby" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "rgba(6,182,212,0.15)",
            border: "1px solid rgba(6,182,212,0.35)",
            borderRadius: 10,
            color: "var(--u3-cyan, #06b6d4)",
            marginBottom: 12,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <span>👁️</span>
          <span>SPECTATOR BROADCAST ACTIVE — Viewing live match actions. Player input controls are isolated.</span>
        </div>
      )}

      {/* Player Score & Roster Cards */}
      <div className="gscore">
        {players.map((p) => {
          const team = p.team || "neon";
          const cfg = TEAM_CONFIG[team] || TEAM_CONFIG.neon;
          const isPlayerSpectator = p.role === "spectator";
          return (
            <div
              key={p.id}
              className={"gp" + (p.id === me.id ? " me" : "")}
              style={{
                borderLeft: `3px solid ${cfg.color}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Dot av={p.av} name={p.name} size={30} top={p.top} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</b>
                  {/* Team badge indicator */}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
                {/* Ready Status / Role Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {isPlayerSpectator ? (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: "rgba(6,182,212,0.15)",
                        color: "#06b6d4",
                        border: "1px solid rgba(6,182,212,0.3)",
                      }}
                    >
                      👁️ SPECTATOR
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: p.ready ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                        color: p.ready ? "#10b981" : "#f59e0b",
                        border: `1px solid ${p.ready ? "#10b981" : "#f59e0b"}`,
                      }}
                    >
                      {p.ready ? "READY" : "NOT READY"}
                    </span>
                  )}
                </div>
              </div>
              <span className="xp">{p.score}</span>
              {v.gained?.[p.id] ? <span className="plus">+{v.gained[p.id]}</span> : null}
            </div>
          );
        })}
      </div>

      <div className="card gstage">
        {v.phase === "lobby" && (
          <>
            <p>{info.blurb}</p>
            {host ? (
              <>
                <label htmlFor="gsel">Game</label>
                <select id="gsel" value={v.game} onChange={(e) => g.setGame(e.target.value as GameId)}>
                  {GAMES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.icon} {x.name}
                    </option>
                  ))}
                </select>

                {/* Ready Check Notice for Host */}
                {activeNonBots.length > 1 && !allReady && (
                  <div
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      marginTop: 12,
                      fontSize: 12,
                      color: "#f59e0b",
                    }}
                  >
                    ⚠️ Ready Check: Waiting for unready players ({unreadyPlayers.map((p) => p.name).join(", ")}).
                    You can wait or trigger host override to launch immediately.
                  </div>
                )}

                <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {allReady ? (
                    <button
                      className="btn"
                      onClick={() => g.start(false)}
                      style={{ minHeight: 44, padding: "0 24px", fontWeight: 800 }}
                    >
                      Start Game ({activePlayers.length} player{activePlayers.length > 1 ? "s" : ""})
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn"
                        disabled
                        style={{ minHeight: 44, padding: "0 20px", fontWeight: 800, opacity: 0.5, cursor: "not-allowed" }}
                      >
                        Start Game (Waiting for Ready)
                      </button>
                      <button
                        className="btn g"
                        onClick={() => g.start(true)}
                        style={{
                          minHeight: 44,
                          padding: "0 18px",
                          borderColor: "#f59e0b",
                          color: "#f59e0b",
                          fontWeight: 700,
                        }}
                      >
                        ⚡ Force Start (Host Override)
                      </button>
                    </>
                  )}

                  {activePlayers.length < 8 && (
                    <button
                      className="btn g"
                      onClick={g.addBot}
                      style={{
                        minHeight: 44,
                        padding: "0 18px",
                        border: "1px dashed rgba(6,182,212,0.6)",
                        color: "var(--u3-cyan)",
                      }}
                    >
                      🤖 + Add AI Rival
                    </button>
                  )}
                </div>
                <p className="hint">
                  Share the room code <b>{code}</b> so friends can join. You can also start alone to practice.
                </p>
              </>
            ) : (
              <p className="hint">Waiting for the host to start…</p>
            )}
          </>
        )}

        {(v.phase === "play" || v.phase === "reveal") && (
          <div className="lbl">
            Round {v.round} of {v.rounds}
          </div>
        )}

        {/* Modular Stage Components */}
        {v.game === "dice" && (v.phase === "play" || v.phase === "reveal") && (
          <DiceStage state={v} myId={me.id} isHost={host && !isSpectator} onAction={isSpectator ? () => {} : g.act} />
        )}

        {v.game === "quiz" && (v.phase === "play" || v.phase === "reveal") && (
          <QuizStage state={v} myId={me.id} isHost={host && !isSpectator} onAction={isSpectator ? () => {} : g.act} />
        )}

        {v.game === "race" && (v.phase === "play" || v.phase === "reveal") && (
          <RaceStage state={v} myId={me.id} isHost={host && !isSpectator} onAction={isSpectator ? () => {} : g.act} />
        )}

        {v.game === "memory" && (v.phase === "play" || v.phase === "reveal") && (
          <MemoryStage state={v} myId={me.id} isHost={host && !isSpectator} onAction={isSpectator ? () => {} : g.act} />
        )}

        {v.game === "cybercode" && (v.phase === "play" || v.phase === "reveal") && (
          <CyberCodeStage state={v} myId={me.id} isHost={host && !isSpectator} onAction={isSpectator ? () => {} : g.act} />
        )}

        {v.phase === "reveal" && <p className="gmsg">{v.msg}</p>}

        {v.phase === "over" && (
          <div style={{
            background: "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(6,9,14,0.95) 80%)",
            border: "1px solid var(--b4-border-glow)",
            borderRadius: 16,
            padding: "24px 20px",
            textAlign: "center",
            marginTop: 16,
          }}>
            <h2 style={{ fontSize: 26, margin: "0 0 8px", color: v.winners?.includes(me.id) ? "var(--b4-gold)" : "#fff" }}>
              {v.winners?.includes(me.id) ? "🏆 VICTORY!" : "GAME OVER"}
            </h2>
            <p style={{ color: "var(--b4-text-muted)", fontSize: 13, margin: "0 0 16px" }}>
              Winner{(v.winners?.length || 0) > 1 ? "s" : ""}:{" "}
              <b style={{ color: "#fff" }}>{(v.winners || []).map((id) => v.players[id]?.name).join(", ")}</b>
            </p>

            {matchReward && (
              <div style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--b4-border)",
                borderRadius: 12,
                padding: "16px",
                maxWidth: 400,
                margin: "0 auto 20px",
                textAlign: "left",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <b style={{ fontSize: 13, color: "#fff" }}>Match Progression Telemetry</b>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-gold)" }}>
                    +{matchReward.tokensEarned} Tokens
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--b4-text-dim)", marginBottom: 6 }}>
                  <span>Base Participation</span>
                  <span style={{ color: "#fff" }}>+{matchReward.baseMatchXp} XP</span>
                </div>
                {matchReward.placementXp > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--b4-text-dim)", marginBottom: 6 }}>
                    <span>Placement Bonus</span>
                    <span style={{ color: "var(--b4-green)" }}>+{matchReward.placementXp} XP</span>
                  </div>
                )}
                {matchReward.performanceXp > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--b4-text-dim)", marginBottom: 6 }}>
                    <span>Skill Performance</span>
                    <span style={{ color: "var(--b4-cyan)" }}>+{matchReward.performanceXp} XP</span>
                  </div>
                )}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#fff",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingTop: 8,
                  marginTop: 6,
                }}>
                  <span>Total XP Earned</span>
                  <span style={{ color: "var(--b4-cyan)" }}>+{matchReward.totalXp} XP</span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "var(--b4-text-muted)" }}>
                      Level {matchReward.newLevelProgress.level} · {matchReward.newLevelProgress.title}
                    </span>
                    <span style={{ color: "var(--b4-accent)", fontWeight: 700 }}>
                      {matchReward.newLevelProgress.progressPercent}%
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${matchReward.newLevelProgress.progressPercent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--b4-cyan), var(--b4-accent))",
                    }} />
                  </div>
                </div>
              </div>
            )}

            {novaSummary && (
              <div style={{
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.3)",
                borderRadius: 12,
                padding: "16px",
                maxWidth: 400,
                margin: "0 auto 20px",
                textAlign: "left",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-cyan)" }}>
                    🤖 Nova Tactical Coaching Analysis
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: novaSummary.rating === "S" ? "var(--b4-gold)" : "var(--b4-accent)",
                    color: "#000",
                  }}>
                    Grade {novaSummary.rating} · {novaSummary.ratingLabel}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#fff", margin: "0 0 6px", fontWeight: 700 }}>
                  {novaSummary.headline}
                </p>
                <p style={{ fontSize: 11, color: "var(--b4-text-muted)", margin: "0 0 10px", lineHeight: 1.4 }}>
                  {novaSummary.summaryText}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--b4-text-dim)" }}>
                    MVP Metric: <b style={{ color: "#fff" }}>{novaSummary.mvpStat}</b>
                  </span>
                  <button
                    className="btn sm"
                    onClick={() => setShowCoach(true)}
                    style={{ fontSize: 10, padding: "3px 8px" }}
                  >
                    Ask Coach 🤖
                  </button>
                </div>
              </div>
            )}

            {host && (
              <button
                className="btn"
                onClick={() => {
                  recordedRef.current = null;
                  setMatchReward(null);
                  setNovaSummary(null);
                  g.again();
                }}
                style={{
                  background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                  fontWeight: 700,
                  padding: "10px 24px",
                }}
              >
                Play Again
              </button>
            )}
          </div>
        )}

        <NovaCoachDrawer
          gameId={v.game}
          matchSummary={novaSummary}
          isOpen={showCoach}
          onClose={() => setShowCoach(false)}
        />
      </div>
    </div>
  );
}