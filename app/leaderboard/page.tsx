"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { useHub } from "@/components/HubProvider";
import { Dot } from "@/components/app/Avatar";
import { leaderboard, useWallet, type Row } from "@/lib/economy/economy";
import {
  getLeaderboardEntries,
  getTier,
  useProgression,
  type LeaderboardCategory,
} from "@/lib/progression";

export default function LeaderboardPage() {
  const { me } = useHub();
  const wal = useWallet();
  const { stats } = useProgression();
  const [rows, setRows] = useState<(Row & { avatar?: string; isMe?: boolean })[]>([]);
  const [filter, setFilter] = useState<LeaderboardCategory>("global");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void leaderboard().then((data) => {
      if (cancelled) return;
      if (data && data.length > 1) {
        setRows(data);
        setLoading(false);
      } else {
        // Local Universe mode: Interleave live player stats with autonomous peer rivals
        const userStats = {
          name: me?.name || "Player One",
          avatar: me?.av || "atlas",
          points: Math.max(wal.earned || 0, stats.totalScore || 0),
          wins: stats.totalWins || 0,
          matches: stats.totalMatches || 0,
          onBoard: wal.onBoard,
        };
        const entries = getLeaderboardEntries(filter, userStats);
        setRows(entries);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filter, me?.name, me?.av, wal.earned, wal.onBoard, stats.totalScore, stats.totalWins, stats.totalMatches]);

  const topThree = rows.slice(0, 3);
  const remaining = rows.slice(3);

  return (
    <AppShell>
      <div className="pagehead">
        <span className="u3-pill-badge" style={{ marginBottom: 8, display: "inline-flex" }}>
          SEASON 4: QUANTUM RESONANCE
        </span>
        <h1>Hall of Champions</h1>
        <p className="hint" style={{ color: "var(--u3-text-dim)", maxWidth: 640 }}>
          Global ranking across all competitive battle matches, arena tournaments, and neural challenges.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
        {(["global", "weekly", "tournaments"] as const).map((tab) => (
          <button
            key={tab}
            className={`chip ${filter === tab ? "on" : ""}`}
            onClick={() => setFilter(tab)}
            style={{
              padding: "8px 18px",
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 600,
              textTransform: "capitalize",
              background: filter === tab ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.2))" : "rgba(255,255,255,0.04)",
              borderColor: filter === tab ? "var(--u3-accent)" : "rgba(255,255,255,0.08)",
              color: filter === tab ? "var(--u3-cyan)" : "var(--u3-text-dim)",
              cursor: "pointer",
            }}
          >
            {tab === "global" ? "🌐 Global All-Time" : tab === "weekly" ? "⚡ Weekly Sprint" : "🏆 Tournament Cup"}
          </button>
        ))}
      </div>

      {/* Top 3 Podium Showcase */}
      {topThree.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          margin: "24px 0 32px",
          alignItems: "end",
        }}>
          {/* #2 Rank */}
          {topThree[1] && (
            <div style={{
              background: "linear-gradient(180deg, rgba(148,163,184,0.12), rgba(11,15,25,0.8))",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: "20px",
              padding: "24px 16px",
              textAlign: "center",
              order: 1,
            }}>
              <span style={{ fontSize: 28 }}>🥈</span>
              <div style={{ margin: "12px auto 8px", width: "max-content" }}>
                <Dot av={topThree[1].avatar || "sage"} name={topThree[1].nm} size={64} on />
              </div>
              <b style={{ fontSize: 18, display: "block", color: "#f1f5f9" }}>{topThree[1].nm}</b>
              <div style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 12px" }}>
                {getTier(topThree[1].total).badge} {getTier(topThree[1].total).name}
              </div>
              <div style={{
                fontFamily: "Space Grotesk, monospace",
                fontSize: 16,
                fontWeight: 700,
                color: "#e2e8f0",
                background: "rgba(255,255,255,0.06)",
                padding: "6px 12px",
                borderRadius: 99,
                display: "inline-block",
              }}>
                ⬡ {topThree[1].total} PTS
              </div>
            </div>
          )}

          {/* #1 Champion */}
          {topThree[0] && (
            <div style={{
              background: "linear-gradient(180deg, rgba(245,158,11,0.2), rgba(11,15,25,0.85))",
              border: "1px solid rgba(245,158,11,0.5)",
              borderRadius: "24px",
              padding: "32px 18px",
              textAlign: "center",
              boxShadow: "0 0 35px rgba(245,158,11,0.25)",
              transform: "translateY(-8px)",
              order: 0,
            }}>
              <span style={{ fontSize: 36 }}>👑</span>
              <div style={{ margin: "12px auto 8px", width: "max-content" }}>
                <Dot av={topThree[0].avatar || "atlas"} name={topThree[0].nm} size={76} on />
              </div>
              <b style={{ fontSize: 20, display: "block", color: "#fff" }}>{topThree[0].nm}</b>
              <div style={{ fontSize: 13, color: "var(--u3-gold)", margin: "4px 0 12px", fontWeight: 600 }}>
                {getTier(topThree[0].total).badge} {getTier(topThree[0].total).name} Champion
              </div>
              <div style={{
                fontFamily: "Space Grotesk, monospace",
                fontSize: 18,
                fontWeight: 700,
                color: "#fbbf24",
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.4)",
                padding: "8px 16px",
                borderRadius: 99,
                display: "inline-block",
              }}>
                ⬡ {topThree[0].total} PTS
              </div>
            </div>
          )}

          {/* #3 Rank */}
          {topThree[2] && (
            <div style={{
              background: "linear-gradient(180deg, rgba(217,119,6,0.12), rgba(11,15,25,0.8))",
              border: "1px solid rgba(217,119,6,0.3)",
              borderRadius: "20px",
              padding: "24px 16px",
              textAlign: "center",
              order: 2,
            }}>
              <span style={{ fontSize: 28 }}>🥉</span>
              <div style={{ margin: "12px auto 8px", width: "max-content" }}>
                <Dot av={topThree[2].avatar || "clay"} name={topThree[2].nm} size={64} on />
              </div>
              <b style={{ fontSize: 18, display: "block", color: "#f1f5f9" }}>{topThree[2].nm}</b>
              <div style={{ fontSize: 12, color: "#d97706", margin: "4px 0 12px" }}>
                {getTier(topThree[2].total).badge} {getTier(topThree[2].total).name}
              </div>
              <div style={{
                fontFamily: "Space Grotesk, monospace",
                fontSize: 16,
                fontWeight: 700,
                color: "#e2e8f0",
                background: "rgba(255,255,255,0.06)",
                padding: "6px 12px",
                borderRadius: 99,
                display: "inline-block",
              }}>
                ⬡ {topThree[2].total} PTS
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ranks Table */}
      <div style={{
        background: "var(--u3-glass-card)",
        border: "1px solid var(--u3-glass-border)",
        borderRadius: "20px",
        padding: "16px",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "50px 1fr 140px 110px",
          padding: "12px 16px",
          color: "var(--u3-text-dim)",
          fontSize: 12,
          fontFamily: "Space Grotesk, monospace",
          letterSpacing: "0.08em",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span>RANK</span>
          <span>PLAYER</span>
          <span>TIER</span>
          <span style={{ textAlign: "right" }}>BOUNTY</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--u3-text-dim)" }}>
            Loading live leaderboard...
          </div>
        ) : remaining.length === 0 && topThree.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--u3-text-dim)" }}>
            No match records logged yet. Play games to earn rank score!
          </div>
        ) : (
          (remaining.length > 0 ? remaining : topThree).map((row, idx) => {
            const actualRank = remaining.length > 0 ? idx + 4 : idx + 1;
            const tier = getTier(row.total);
            const isMe = (me?.name && me.name === row.nm) || row.isMe;
            return (
              <div
                key={row.nm + idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 140px 110px",
                  padding: "14px 16px",
                  alignItems: "center",
                  borderRadius: "12px",
                  background: isMe ? "rgba(139,92,246,0.12)" : "transparent",
                  border: isMe ? "1px solid rgba(139,92,246,0.3)" : "none",
                  margin: "4px 0",
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  fontFamily: "Space Grotesk, monospace",
                  fontWeight: 700,
                  fontSize: 14,
                  color: actualRank <= 10 ? "var(--u3-cyan)" : "var(--u3-text-dim)",
                }}>
                  #{actualRank}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Dot av={row.avatar || "atlas"} name={row.nm} size={36} on />
                  <div>
                    <b style={{ color: isMe ? "var(--u3-cyan)" : "var(--u3-text)", fontSize: 14 }}>{row.nm}</b>
                    {isMe && <small style={{ marginLeft: 6, color: "var(--u3-accent)", fontWeight: 600 }}>YOU</small>}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: tier.color }}>
                  <span>{tier.badge}</span>
                  <span>{tier.name}</span>
                </div>

                <div style={{
                  textAlign: "right",
                  fontFamily: "Space Grotesk, monospace",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--u3-gold)",
                }}>
                  ⬡ {row.total}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
