"use client";

import { useState } from "react";
import type { GameId } from "@/lib/games/types";
import {
  getGameRuleExplanation,
  generateTacticalAdvice,
  type NovaMatchSummary,
  type GameRuleExplanation,
} from "@/lib/world/novaCompanion";
import { answerGame } from "@/lib/world/novaKnowledge";

export interface NovaCoachDrawerProps {
  gameId?: GameId;
  matchSummary?: NovaMatchSummary | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function NovaCoachDrawer({
  gameId = "dice",
  matchSummary,
  isOpen = false,
  onClose,
}: NovaCoachDrawerProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "coach" | "ask">("rules");
  const [selectedGame, setSelectedGame] = useState<GameId>(gameId);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const explanation: GameRuleExplanation = getGameRuleExplanation(selectedGame);
  const tacticalAdvice = generateTacticalAdvice(selectedGame);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "game_coach",
          text: `${selectedGame}: ${query.trim()}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnswer(data.text || answerGame(selectedGame, query));
      } else {
        setAnswer(answerGame(selectedGame, query));
      }
    } catch {
      setAnswer(answerGame(selectedGame, query));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      width: "min(420px, 92vw)",
      background: "rgba(6, 10, 18, 0.96)",
      backdropFilter: "blur(24px)",
      borderLeft: "1px solid rgba(139, 92, 246, 0.3)",
      boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.7)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      padding: "20px",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 16,
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--b4-cyan, #06b6d4), var(--b4-accent, #8b5cf6))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}>
            🤖
          </div>
          <div>
            <b style={{ color: "#fff", fontSize: 15, display: "block" }}>Dr. Nova AI Coach</b>
            <span style={{ fontSize: 11, color: "var(--b4-cyan, #06b6d4)" }}>Tactical In-Game Strategist</span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              width: 28,
              height: 28,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Game Selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {(["dice", "quiz", "race", "memory", "cybercode"] as GameId[]).map((gid) => (
          <button
            key={gid}
            onClick={() => setSelectedGame(gid)}
            style={{
              background: selectedGame === gid ? "var(--b4-accent, #8b5cf6)" : "rgba(255,255,255,0.05)",
              color: selectedGame === gid ? "#fff" : "var(--u3-text-dim, #94a3b8)",
              border: "1px solid " + (selectedGame === gid ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"),
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {gid}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6,
        marginBottom: 16,
        background: "rgba(255, 255, 255, 0.03)",
        padding: 4,
        borderRadius: 10,
      }}>
        <button
          onClick={() => setActiveTab("rules")}
          style={{
            background: activeTab === "rules" ? "rgba(255, 255, 255, 0.08)" : "none",
            color: activeTab === "rules" ? "#fff" : "var(--u3-text-dim, #94a3b8)",
            border: "none",
            borderRadius: 6,
            padding: "6px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Rules
        </button>
        <button
          onClick={() => setActiveTab("coach")}
          style={{
            background: activeTab === "coach" ? "rgba(255, 255, 255, 0.08)" : "none",
            color: activeTab === "coach" ? "#fff" : "var(--u3-text-dim, #94a3b8)",
            border: "none",
            borderRadius: 6,
            padding: "6px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Pro Coach
        </button>
        <button
          onClick={() => setActiveTab("ask")}
          style={{
            background: activeTab === "ask" ? "rgba(255, 255, 255, 0.08)" : "none",
            color: activeTab === "ask" ? "#fff" : "var(--u3-text-dim, #94a3b8)",
            border: "none",
            borderRadius: 6,
            padding: "6px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Ask Nova
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {activeTab === "rules" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 12,
              padding: "14px",
            }}>
              <span style={{ fontSize: 11, color: "var(--b4-cyan, #06b6d4)", fontWeight: 800 }}>OBJECTIVE</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>
                {explanation.objective}
              </p>
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 12,
              padding: "14px",
            }}>
              <span style={{ fontSize: 11, color: "var(--b4-gold, #f59e0b)", fontWeight: 800 }}>CORE MECHANIC</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>
                {explanation.coreMechanic}
              </p>
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 12,
              padding: "14px",
            }}>
              <span style={{ fontSize: 11, color: "var(--b4-green, #10b981)", fontWeight: 800 }}>SCORING SYSTEM</span>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>
                {explanation.scoring}
              </p>
            </div>
          </div>
        )}

        {activeTab === "coach" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              background: "rgba(139, 92, 246, 0.1)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: 12,
              padding: "14px",
            }}>
              <span style={{ fontSize: 11, color: "var(--b4-accent, #8b5cf6)", fontWeight: 800 }}>PRO TACTICAL TIP</span>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>
                {explanation.proTip}
              </p>
            </div>

            {matchSummary && (
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 12,
                padding: "14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--b4-cyan, #06b6d4)", fontWeight: 800 }}>POST-MATCH TELEMETRY</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: matchSummary.rating === "S" ? "var(--b4-gold, #f59e0b)" : "var(--b4-accent, #8b5cf6)",
                    color: "#000",
                  }}>
                    Grade {matchSummary.rating}
                  </span>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 12, color: "#fff", fontWeight: 700 }}>
                  {matchSummary.headline}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--u3-text-dim, #94a3b8)" }}>
                  {matchSummary.summaryText}
                </p>
                {matchSummary.coachingNotes.map((note, idx) => (
                  <div key={idx} style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 4, display: "flex", gap: 6 }}>
                    <span>•</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ask" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="inp grow"
                placeholder={`Ask Nova about ${selectedGame}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                style={{ fontSize: 12 }}
              />
              <button
                className="btn sm"
                onClick={handleAsk}
                disabled={loading || !query.trim()}
                style={{ fontSize: 11 }}
              >
                {loading ? "..." : "Consult"}
              </button>
            </div>

            {answer && (
              <div style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
                borderRadius: 12,
                padding: "14px",
                fontSize: 12,
                color: "#e2e8f0",
                lineHeight: 1.6,
              }}>
                <b style={{ color: "var(--b4-cyan, #06b6d4)", display: "block", marginBottom: 6 }}>
                  Dr. Nova's Advice:
                </b>
                {answer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
