"use client";

import { useEffect, useState } from "react";
import type { GameStageProps } from "@/lib/games/types";

const GLYPHS = [
  { id: 0, name: "DELTA", symbol: "▲", color: "#10b981", bg: "rgba(16, 185, 129, 0.2)", glow: "rgba(16, 185, 129, 0.6)" },
  { id: 1, name: "THETA", symbol: "◆", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.2)", glow: "rgba(6, 182, 212, 0.6)" },
  { id: 2, name: "SIGMA", symbol: "●", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)", glow: "rgba(245, 158, 11, 0.6)" },
  { id: 3, name: "OMEGA", symbol: "✦", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.2)", glow: "rgba(139, 92, 246, 0.6)" },
];

export default function MemoryStage({ state, myId, onAction }: GameStageProps) {
  const v = state;
  const seq = v.memorySeq || [];
  const myInputs = v.memoryInput?.[myId] || [];
  const isFailed = v.memoryFailures?.includes(myId);
  const isComplete = !isFailed && seq.length > 0 && myInputs.length === seq.length;
  const isWatchPhase = v.memoryPhase === "watch";
  const isInputPhase = v.memoryPhase === "input";

  // Watch phase sequence playback simulation
  const [activeStep, setActiveStep] = useState<number>(-1);

  useEffect(() => {
    if (!isWatchPhase || seq.length === 0) {
      setActiveStep(-1);
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      if (current < seq.length) {
        setActiveStep(seq[current]);
        current++;
      } else {
        setActiveStep(-1);
        clearInterval(interval);
      }
    }, 650);

    return () => clearInterval(interval);
  }, [isWatchPhase, seq]);

  const handleTap = (glyphIndex: number) => {
    if (!isInputPhase || isFailed || isComplete) return;
    onAction({ t: "seq_tap", index: glyphIndex });
  };

  return (
    <div className="memory-stage" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* HUD Header Status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderRadius: 8,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--u3-muted)", textTransform: "uppercase" }}>
            Matrix Security Cipher
          </span>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
            {isWatchPhase
              ? "⚡ SYSTEM TRANSMITTING CIPHER..."
              : isFailed
              ? "❌ CIPHER OVERHEAT / LOCKOUT"
              : isComplete
              ? "✓ DECRYPTION COMPLETE"
              : `REPLICATE: Step ${myInputs.length + 1} of ${seq.length}`}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {seq.map((glyphId, idx) => {
            const entered = myInputs[idx] !== undefined;
            const current = myInputs.length === idx && isInputPhase;
            const glyphColor = GLYPHS[glyphId]?.color || "#fff";

            return (
              <div
                key={idx}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: `2px solid ${glyphColor}`,
                  background: entered
                    ? glyphColor
                    : current
                    ? "rgba(255,255,255,0.4)"
                    : "transparent",
                  boxShadow: entered ? `0 0 8px ${glyphColor}` : undefined,
                  transition: "all 0.2s ease",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 2x2 Interactive Cyber Glyph Pad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          maxWidth: 400,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {GLYPHS.map((g) => {
          const isIlluminated = isWatchPhase && activeStep === g.id;
          const isButtonActive = isInputPhase && !isFailed && !isComplete;

          return (
            <button
              key={g.id}
              disabled={!isButtonActive}
              onClick={() => handleTap(g.id)}
              style={{
                height: 120,
                borderRadius: 12,
                border: `2px solid ${isIlluminated ? "#fff" : g.color}`,
                background: isIlluminated ? g.color : g.bg,
                color: isIlluminated ? "#000" : "#fff",
                boxShadow: isIlluminated
                  ? `0 0 25px ${g.glow}, inset 0 0 15px #fff`
                  : `0 0 8px ${g.glow}`,
                cursor: isButtonActive ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isIlluminated ? "scale(1.04)" : "scale(1)",
                opacity: isFailed ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{g.symbol}</span>
              <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5 }}>{g.name}</span>
            </button>
          );
        })}
      </div>

      {/* State Feedback Banner */}
      {isFailed && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            borderRadius: 6,
            color: "#fb7185",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ⚠️ Sequence error detected. Security lockout engaged for this round.
        </div>
      )}

      {isComplete && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 6,
            color: "#34d399",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ✓ Matrix cipher successfully replicated in {v.memoryTimes?.[myId] ?? 0}ms! Waiting for rivals...
        </div>
      )}
    </div>
  );
}
