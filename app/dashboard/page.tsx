"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { GameCover } from "@/components/games/GameArtwork";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { useWallet } from "@/lib/economy/economy";
import { GAMES, type GameId } from "@/lib/games/types";
import { play } from "@/lib/sound";
import { getTimeUntilUtcMidnight, useProgression } from "@/lib/progression";

export default function DashboardPage() {
  const router = useRouter();
  const { me } = useHub();
  const toast = useToast();
  const wal = useWallet();
  const { bounties, levelProgress, claimBounty } = useProgression();
  const [countdown, setCountdown] = useState(getTimeUntilUtcMidnight().formatted);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilUtcMidnight().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const playerName = me?.name || "Commander Vega";
  const featuredGame = GAMES.find((g) => g.id === "race") || GAMES[0];

  const recentGames = [
    { ...GAMES[2], lastPlayed: "12m ago", rank: "Top 2%" },
    { ...GAMES[0], lastPlayed: "2h ago", rank: "Rank 14" },
    { ...GAMES[1], lastPlayed: "Yesterday", rank: "100% Streak" },
  ];

  const friends = [
    { name: "Nova [AI]", status: "In Match", game: "Neural Quiz Arena", ping: "12ms", av: "atlas" },
    { name: "Viper_99", status: "Racing", game: "Quantum Warp GP", ping: "18ms", av: "sage" },
    { name: "Echo_Zero", status: "In 3D Lounge", game: "High-Orbit Pavilion", ping: "22ms", av: "slate" },
    { name: "Apex_Ghost", status: "In Armory", game: "Customizing Loadout", ping: "25ms", av: "clay" },
  ];

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* 1. TOP CONTROL CENTRE WELCOME HUD */}
        <div
          style={{
            background: "radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.2) 0%, rgba(11,16,26,0.95) 70%), #06090e",
            border: "1px solid var(--b4-border-glow)",
            borderRadius: 20,
            padding: "28px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Avatar Hexagon */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 900,
                color: "#fff",
                boxShadow: "0 0 20px rgba(6,182,212,0.4)",
                flexShrink: 0,
              }}
            >
              {playerName.charAt(0).toUpperCase()}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-cyan)", letterSpacing: 1.5, textTransform: "uppercase" }}>
                  // SYSTEM OPERATIONAL · LEVEL {levelProgress.level} · {levelProgress.title.toUpperCase()}
                </span>
                <span style={{ fontSize: 10, background: "rgba(16,185,129,0.15)", color: "var(--b4-green)", border: "1px solid rgba(16,185,129,0.3)", padding: "2px 8px", borderRadius: 99, fontWeight: 800 }}>
                  ● ONLINE
                </span>
              </div>
              <h1 style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: -0.5 }}>
                Welcome back, {playerName}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
                {/* XP Progress Bar */}
                <div style={{ width: 180, height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${levelProgress.progressPercent}%`, height: "100%", background: "linear-gradient(90deg, var(--b4-cyan), var(--b4-accent))" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--b4-text-muted)" }}>
                  {levelProgress.progressXp} / {levelProgress.requiredXp} XP ({levelProgress.progressPercent}%) <small style={{ color: "var(--b4-accent)" }}>(Level {levelProgress.level + 1} Next)</small>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--b4-border)", padding: "10px 18px", borderRadius: 12, textAlign: "right" }}>
              <span style={{ fontSize: 10, color: "var(--b4-text-dim)", fontWeight: 800, letterSpacing: 1, display: "block" }}>
                VAULT BALANCE
              </span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "var(--b4-gold)" }}>
                {wal.tokens || 55} TOKENS
              </span>
            </div>
            <button
              onClick={() => router.push("/games")}
              style={{
                background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                border: "none",
                color: "#fff",
                fontWeight: 900,
                fontSize: 13,
                padding: "14px 22px",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(6,182,212,0.4)",
              }}
            >
              LAUNCH GAME NEXUS →
            </button>
          </div>
        </div>

        {/* 2. CONTINUE PLAYING SPOTLIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-cyan)", letterSpacing: 1 }}>
              CONTINUE PLAYING // ACTIVE SIMULATION
            </span>
            <span style={{ fontSize: 12, color: "var(--b4-text-dim)" }}>Last Match: 12m ago</span>
          </div>

          <div
            className="b4-hero-banner"
            style={{
              minHeight: 280,
              background: "radial-gradient(ellipse at 80% 30%, rgba(244,63,94,0.2) 0%, rgba(6,9,14,0.95) 75%), #080d18",
              borderColor: "var(--b4-border-glow)",
              padding: 28,
            }}
          >
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", opacity: 0.65, pointerEvents: "none" }}>
              <GameCover id={featuredGame.id} />
            </div>
            <div className="b4-hero-meta" style={{ position: "relative", zIndex: 3, maxWidth: 540 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ background: "var(--b4-rose)", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 6 }}>
                  RACE IN PROGRESS
                </span>
                <span style={{ color: "var(--b4-gold)", fontSize: 12, fontWeight: 800 }}>LANE 2 · NITRO CHARGED</span>
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "4px 0" }}>
                {featuredGame.name}
              </h2>
              <p style={{ color: "var(--b4-text-muted)", fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
                Slipstream drafting active. AI Rivals Nova [AI] and Viper [Bot] are waiting in the starting grid.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button
                  onClick={() => router.push("/games")}
                  style={{
                    background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                    border: "none",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 13,
                    padding: "11px 22px",
                    borderRadius: 10,
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(6,182,212,0.3)",
                  }}
                >
                  RESUME RACE MATCH ⚡
                </button>
                <button
                  onClick={() => router.push("/tournaments")}
                  style={{
                    background: "var(--b4-bg-elevated)",
                    border: "1px solid var(--b4-border)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "11px 18px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  STANDINGS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. TWO-COLUMN LAYOUT: RECENT GAMES & FRIENDS ACTIVITY */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
          {/* Recently Played Carousel / Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-text-main)", letterSpacing: 1 }}>
                RECENTLY PLAYED & RECOMMENDED
              </span>
              <button
                onClick={() => router.push("/games")}
                style={{ background: "none", border: "none", color: "var(--b4-cyan)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                ALL GAMES →
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentGames.map((g) => (
                <div
                  key={g.id}
                  onClick={() => router.push("/games")}
                  style={{
                    background: "var(--b4-bg-surface)",
                    border: "1px solid var(--b4-border)",
                    borderRadius: 14,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 56, height: 42, borderRadius: 8, overflow: "hidden", background: "#06090e" }}>
                      <GameCover id={g.id} />
                    </div>
                    <div>
                      <b style={{ fontSize: 15, color: "#fff", display: "block" }}>{g.name}</b>
                      <span style={{ fontSize: 12, color: "var(--b4-text-dim)" }}>
                        {g.category} · Played {g.lastPlayed}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-green)", display: "block" }}>
                      {g.rank}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--b4-cyan)", fontWeight: 700 }}>
                      PLAY →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Friends & Squad Radar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-text-main)", letterSpacing: 1 }}>
                FRIENDS ONLINE (4 ACTIVE)
              </span>
              <button
                onClick={() => router.push("/people")}
                style={{ background: "none", border: "none", color: "var(--b4-cyan)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                SQUAD ROSTER →
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {friends.map((f, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--b4-bg-surface)",
                    border: "1px solid var(--b4-border)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid var(--b4-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      {f.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <b style={{ fontSize: 13.5, color: "#fff" }}>{f.name}</b>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--b4-green)" }} />
                      </div>
                      <span style={{ fontSize: 11.5, color: "var(--b4-text-muted)" }}>
                        {f.status} · {f.game}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      toast(`Invited ${f.name} to your squad battle party.`);
                      play("pop");
                    }}
                    style={{
                      background: "rgba(139,92,246,0.15)",
                      border: "1px solid rgba(139,92,246,0.35)",
                      color: "var(--b4-accent)",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "6px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    + INVITE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. DAILY BOUNTIES & TOURNAMENTS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {/* Daily Missions */}
          <div style={{ background: "var(--b4-bg-surface)", border: "1px solid var(--b4-border)", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 15, color: "#fff" }}>⚡ Daily Bounties</b>
              <span style={{ fontSize: 11, color: "var(--b4-text-dim)" }}>Resets in {countdown}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bounties.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: b.completed && !b.claimed ? "1px solid var(--b4-border-glow)" : "1px solid var(--b4-border)",
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ fontSize: 13, color: "#fff", display: "block" }}>{b.title}</b>
                    <span style={{ fontSize: 11.5, color: "var(--b4-text-muted)" }}>
                      {b.description} ({b.currentCount}/{b.targetCount})
                    </span>
                  </div>

                  {b.claimed ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--b4-text-dim)" }}>CLAIMED</span>
                  ) : b.completed ? (
                    <button
                      onClick={() => {
                        play("win");
                        const res = claimBounty(b.id);
                        toast(`Bounty Claimed! +${res.tokens} Tokens & +${res.xp} XP credited.`);
                      }}
                      style={{
                        background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                        border: "none",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 11,
                        padding: "6px 12px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      CLAIM +{b.tokenReward}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-gold)" }}>+{b.tokenReward} TOKENS</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tournaments Widget */}
          <div style={{ background: "var(--b4-bg-surface)", border: "1px solid var(--b4-border)", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 15, color: "#fff" }}>🏆 Upcoming Arena Tournaments</b>
              <button onClick={() => router.push("/tournaments")} style={{ background: "none", border: "none", color: "var(--b4-cyan)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                VIEW ALL →
              </button>
            </div>

            <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(244,63,94,0.2)", color: "var(--b4-rose)", padding: "2px 6px", borderRadius: 4 }}>
                  ● LIVE BROADCAST
                </span>
                <span style={{ fontSize: 12, fontWeight: 900, color: "var(--b4-gold)" }}>5,000 TOKENS</span>
              </div>
              <b style={{ fontSize: 15, color: "#fff", display: "block" }}>Apex Cyber Dice Championship</b>
              <span style={{ fontSize: 12, color: "var(--b4-text-muted)", display: "block", marginTop: 2 }}>
                14 / 16 Squads Registered · Starts in 42m
              </span>
              <button
                onClick={() => router.push("/tournaments")}
                style={{
                  width: "100%",
                  marginTop: 10,
                  background: "var(--b4-bg-elevated)",
                  border: "1px solid var(--b4-border)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "8px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                ENTER BRACKET
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
