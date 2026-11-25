"use client";

import { useState } from "react";
import AppShell from "@/components/app/AppShell";
import GameRoom from "@/components/games/GameRoom";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import {
  getTournaments,
  registerParticipant,
  launchTournamentMatch,
  advanceTournamentWinner,
  type Tournament,
  type TournamentMatch,
  type TournamentStatus,
} from "@/lib/tournaments";
import { play } from "@/lib/sound";

export default function TournamentsPage() {
  const { me } = useHub();
  const toast = useToast();
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>(() => getTournaments());
  const [selectedId, setSelectedId] = useState<string>("tourney-cyber-neon");
  const [filter, setFilter] = useState<"all" | TournamentStatus>("all");
  const [playingMatch, setPlayingMatch] = useState<{ match: TournamentMatch; tournament: Tournament } | null>(null);

  const selected = tournamentsList.find((t) => t.id === selectedId) || tournamentsList[0];

  const handleRegister = (tournamentId: string) => {
    if (!me) {
      toast("Please connect your player profile first.");
      return;
    }
    try {
      const res = registerParticipant(tournamentId, {
        id: me.id,
        name: me.name,
        avatar: me.av,
        team: "neon",
      });
      if (res.success) {
        play("pop");
        setTournamentsList([...getTournaments()]);
        toast(res.message);
      } else {
        toast(res.message);
      }
    } catch (e: any) {
      toast(e.message || "Failed to register");
    }
  };

  const handleLaunchMatch = (match: TournamentMatch) => {
    try {
      play("go");
      const updatedMatch = launchTournamentMatch(selected.id, match.id);
      setTournamentsList([...getTournaments()]);
      toast(`Launched match room ${updatedMatch.roomCode}! Entering battle room...`);
      setPlayingMatch({ match: updatedMatch, tournament: selected });
    } catch (e: any) {
      toast(e.message || "Could not launch match");
    }
  };

  const isUserRegistered = Boolean(selected?.participants.some((p) => p.id === me?.id));

  // If currently inside an active tournament match room
  if (playingMatch && me) {
    return (
      <AppShell>
        <div style={{ marginBottom: 16 }}>
          <button
            className="btn g sm"
            onClick={() => setPlayingMatch(null)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            ← Return to Tournament Bracket
          </button>
        </div>
        <GameRoom
          code={playingMatch.match.roomCode || "TRN100"}
          host={true}
          initial={playingMatch.match.gameId}
          me={me}
          role="player"
          tournamentContext={{
            tournamentId: playingMatch.tournament.id,
            matchId: playingMatch.match.id,
            round: playingMatch.match.round,
          }}
          onLeave={() => {
            setPlayingMatch(null);
            setTournamentsList([...getTournaments()]);
          }}
        />
      </AppShell>
    );
  }

  const filteredTournaments = tournamentsList.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  return (
    <AppShell>
      <div className="pagehead">
        <span className="u3-pill-badge" style={{ marginBottom: 8, display: "inline-flex" }}>
          ESPORTS ARENA
        </span>
        <h1>Competitive Gaming Tournaments</h1>
        <p className="hint" style={{ color: "var(--u3-text-dim)", maxWidth: 680 }}>
          Enter automated single-elimination tournament brackets and speedrun ladders, battle global rivals, claim prize
          token bounties, and climb to the top of the champions podium.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, margin: "20px 0 8px", flexWrap: "wrap" }}>
        {(
          [
            { id: "all", label: "All Tournaments" },
            { id: "active", label: "● Live Matches" },
            { id: "upcoming", label: "Upcoming" },
            { id: "completed", label: "Concluded" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              background: filter === tab.id ? "var(--u3-accent, #8b5cf6)" : "var(--u3-glass-card, rgba(255,255,255,0.05))",
              color: filter === tab.id ? "#fff" : "var(--u3-text-dim, #888)",
              border: `1px solid ${filter === tab.id ? "var(--u3-accent, #8b5cf6)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 99,
              padding: "6px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tournaments Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          margin: "16px 0 28px",
        }}
      >
        {filteredTournaments.map((t) => {
          const isSelected = selected.id === t.id;
          const isLive = t.status === "active";
          const isEnded = t.status === "completed";
          return (
            <div
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(6,182,212,0.12))"
                  : "var(--u3-glass-card)",
                border: `1px solid ${isSelected ? "var(--u3-accent, #8b5cf6)" : "var(--u3-glass-border)"}`,
                borderRadius: "18px",
                padding: "20px",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: isSelected ? "0 0 24px rgba(139,92,246,0.25)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 26 }}>{t.gameIcon}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "Space Grotesk, monospace",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 99,
                    background: isLive
                      ? "rgba(239,68,68,0.2)"
                      : isEnded
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(6,182,212,0.15)",
                    color: isLive ? "#ef4444" : isEnded ? "#10b981" : "#06b6d4",
                    border: `1px solid ${
                      isLive ? "#ef4444" : isEnded ? "rgba(16,185,129,0.4)" : "rgba(6,182,212,0.4)"
                    }`,
                    textTransform: "uppercase",
                  }}
                >
                  {isLive ? "● LIVE MATCHES" : isEnded ? "✓ CONCLUDED" : "UPCOMING"}
                </span>
              </div>

              <b style={{ fontSize: 17, display: "block", color: "var(--u3-text)", marginBottom: 6 }}>{t.title}</b>
              <div style={{ fontSize: 13, color: "var(--u3-text-dim)", marginBottom: 12 }}>Game: {t.gameTitle}</div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: 12,
                }}
              >
                <span style={{ color: "var(--u3-gold, #f59e0b)", fontWeight: 700 }}>
                  🏆 {t.prizePool.toLocaleString()} Tokens
                </span>
                <span style={{ color: "var(--u3-text-dim)" }}>
                  👥 {t.participants.length}/{t.maxParticipants} slots
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Tournament Detail & Interactive Bracket */}
      <div
        style={{
          background: "var(--u3-glass-card)",
          border: "1px solid var(--u3-glass-border)",
          borderRadius: "20px",
          padding: "28px",
          marginTop: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 12, color: "var(--u3-accent, #8b5cf6)", fontWeight: 700, letterSpacing: "0.08em" }}>
              BRACKET OVERVIEW & SCHEDULE
            </span>
            <h2 style={{ fontSize: 26, margin: "4px 0 8px", color: "var(--u3-text)" }}>{selected.title}</h2>
            <p style={{ color: "var(--u3-text-dim)", margin: 0, fontSize: 14 }}>
              Format: <b>{selected.format}</b> · Match Time: <b>{selected.date}</b> · Entry: <b>{selected.entryFee}</b> · Size:{" "}
              <b>{selected.size} Teams</b>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn"
              disabled={isUserRegistered || selected.status === "completed" || selected.participants.length >= selected.maxParticipants}
              onClick={() => handleRegister(selected.id)}
              style={{
                background: isUserRegistered
                  ? "rgba(16,185,129,0.2)"
                  : selected.status === "completed"
                  ? "rgba(255,255,255,0.1)"
                  : "linear-gradient(135deg, var(--u3-accent, #8b5cf6), var(--u3-cyan, #06b6d4))",
                borderColor: isUserRegistered ? "#10b981" : "transparent",
                color: isUserRegistered ? "#10b981" : "#fff",
                boxShadow: isUserRegistered ? "none" : "0 0 20px rgba(139,92,246,0.35)",
                padding: "12px 24px",
                fontWeight: 700,
              }}
            >
              {isUserRegistered
                ? "✓ Roster Confirmed"
                : selected.status === "completed"
                ? "🏆 Tournament Ended"
                : selected.participants.length >= selected.maxParticipants
                ? "Slots Full"
                : "⚔️ Register Squad"}
            </button>
          </div>
        </div>

        {/* Prize Pool Distribution Ribbon */}
        {selected.prizes && selected.prizes.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              margin: "20px 0 10px",
              padding: "12px 16px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--u3-gold, #f59e0b)", alignSelf: "center" }}>
              PRIZE POOL:
            </span>
            {selected.prizes.map((p) => (
              <div
                key={p.rank}
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.03)",
                  padding: "4px 10px",
                  borderRadius: 8,
                }}
              >
                <b style={{ color: p.rank === 1 ? "var(--u3-gold, #f59e0b)" : "#fff" }}>
                  {p.rank === 1 ? "🥇 1st" : p.rank === 2 ? "🥈 2nd" : p.rank === 3 ? "🥉 3rd" : "4th"}:
                </b>
                <span>{p.tokens.toLocaleString()} Tokens ({p.percentage}%)</span>
                {p.participantName && (
                  <span style={{ color: "var(--u3-cyan, #06b6d4)", fontWeight: 700 }}>· {p.participantName}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Interactive Bracket Viewer */}
        <h3 style={{ fontSize: 16, marginTop: 28, marginBottom: 16, color: "var(--u3-text)" }}>
          Interactive Elimination Bracket Tree
        </h3>

        {selected.rounds.length === 0 ? (
          <div
            style={{
              padding: "36px",
              textAlign: "center",
              color: "var(--u3-text-dim)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 12,
            }}
          >
            Brackets generate dynamically as participants register.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 28,
              overflowX: "auto",
              paddingBottom: 16,
              alignItems: "flex-start",
            }}
          >
            {selected.rounds.map((round) => (
              <div key={round.roundIndex} style={{ flex: "1 0 260px", minWidth: 260 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--u3-cyan)",
                    fontFamily: "Space Grotesk, monospace",
                    fontWeight: 700,
                    marginBottom: 12,
                    textTransform: "uppercase",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{round.name}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {round.matches.length} Match{round.matches.length > 1 ? "es" : ""}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {round.matches.map((match) => {
                    const isMatchLive = match.status === "live";
                    const isMatchCompleted = match.status === "completed";
                    const hasBoth = Boolean(match.p1 && match.p2);

                    return (
                      <div
                        key={match.id}
                        style={{
                          background: isMatchLive
                            ? "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(11,15,25,0.85))"
                            : "rgba(11,15,25,0.75)",
                          border: `1px solid ${
                            isMatchLive ? "#ef4444" : isMatchCompleted ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"
                          }`,
                          borderRadius: "14px",
                          padding: "14px",
                          fontSize: 13,
                          position: "relative",
                        }}
                      >
                        {/* Match Status Header */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 10,
                            fontWeight: 800,
                            marginBottom: 8,
                            color: "var(--u3-text-dim)",
                          }}
                        >
                          <span style={{ textTransform: "uppercase" }}>
                            MATCH #{match.matchIndex + 1}
                            {match.roomCode && ` · ROOM ${match.roomCode}`}
                          </span>
                          <span
                            style={{
                              color: isMatchLive ? "#ef4444" : isMatchCompleted ? "#10b981" : "var(--u3-text-dim)",
                            }}
                          >
                            {isMatchLive ? "● LIVE" : isMatchCompleted ? "✓ COMPLETED" : match.isBye ? "BYE" : "SCHEDULED"}
                          </span>
                        </div>

                        {/* Participant 1 Slot */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 8px",
                            borderRadius: 6,
                            background:
                              match.winnerId && match.winnerId === match.p1?.id
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(255,255,255,0.02)",
                            marginBottom: 4,
                            color:
                              match.winnerId && match.winnerId === match.p1?.id
                                ? "#10b981"
                                : match.p1
                                ? "var(--u3-text)"
                                : "var(--u3-text-dim)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {match.p1?.seed && (
                              <span style={{ fontSize: 10, opacity: 0.6 }}>[#{match.p1.seed}]</span>
                            )}
                            <b>{match.p1?.name || "TBD"}</b>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {match.score1 !== undefined && (
                              <span style={{ fontWeight: 800, fontSize: 12 }}>{match.score1}</span>
                            )}
                            {match.winnerId && match.winnerId === match.p1?.id && <span>👑</span>}
                          </div>
                        </div>

                        {/* Participant 2 Slot */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 8px",
                            borderRadius: 6,
                            background:
                              match.winnerId && match.winnerId === match.p2?.id
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(255,255,255,0.02)",
                            color:
                              match.winnerId && match.winnerId === match.p2?.id
                                ? "#10b981"
                                : match.p2
                                ? "var(--u3-text)"
                                : "var(--u3-text-dim)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {match.p2?.seed && (
                              <span style={{ fontSize: 10, opacity: 0.6 }}>[#{match.p2.seed}]</span>
                            )}
                            <b>{match.p2?.name || "TBD"}</b>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {match.score2 !== undefined && (
                              <span style={{ fontWeight: 800, fontSize: 12 }}>{match.score2}</span>
                            )}
                            {match.winnerId && match.winnerId === match.p2?.id && <span>👑</span>}
                          </div>
                        </div>

                        {/* Match Launch Button */}
                        {hasBoth && !isMatchCompleted && (
                          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                            <button
                              className="btn sm"
                              onClick={() => handleLaunchMatch(match)}
                              style={{
                                width: "100%",
                                padding: "6px 0",
                                fontSize: 11.5,
                                fontWeight: 800,
                                background: isMatchLive
                                  ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                                  : "linear-gradient(135deg, var(--u3-accent), var(--u3-cyan))",
                              }}
                            >
                              {isMatchLive ? "⚔️ Join Live Battle" : "⚔️ Launch Match"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
