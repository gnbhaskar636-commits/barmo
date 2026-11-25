"use client";

import { useState } from "react";
import type { Squad, SquadMember } from "@/lib/social/types";
import { Dot } from "@/components/app/Avatar";

export interface SquadRadarProps {
  squad?: Squad | null;
  myId?: string;
  onJoinMatch?: (roomCode: string) => void;
  onToggleVoice?: (active: boolean) => void;
  onOpenSquadChat?: () => void;
}

export default function SquadRadar({
  squad,
  myId,
  onJoinMatch,
  onToggleVoice,
  onOpenSquadChat,
}: SquadRadarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!squad) {
    return (
      <div style={{
        background: "rgba(10, 14, 23, 0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 14,
        padding: "12px 16px",
        color: "var(--u3-text-dim, #94a3b8)",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📡</span>
          <span><b>Squad Radar:</b> Offline · No active syndicate</span>
        </div>
        <a href="/groups" className="btn sm g" style={{ fontSize: 11, padding: "4px 10px" }}>
          Join Squad →
        </a>
      </div>
    );
  }

  const voiceRoom = squad.voiceRoom;
  const activeVoiceCount = voiceRoom?.activeSpeakers?.length || 0;
  const onlineCount = squad.members.filter((m) => m.isOnline).length;

  return (
    <div style={{
      background: "radial-gradient(ellipse at top left, rgba(139,92,246,0.12) 0%, rgba(6,10,18,0.92) 80%)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(139, 92, 246, 0.3)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 16px rgba(139, 92, 246, 0.05)",
      borderRadius: 16,
      overflow: "hidden",
      transition: "all 0.25s ease",
    }}>
      {/* Radar Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "var(--b4-cyan, #06b6d4)",
            boxShadow: "0 0 8px var(--b4-cyan, #06b6d4)",
            animation: "pulse 2s infinite",
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "var(--b4-cyan, #06b6d4)",
            textTransform: "uppercase",
          }}>
            {squad.tag}
          </span>
          <b style={{ color: "#fff", fontSize: 14 }}>{squad.name}</b>
          <span style={{
            fontSize: 11,
            color: "var(--u3-text-dim, #94a3b8)",
            background: "rgba(255,255,255,0.06)",
            padding: "2px 6px",
            borderRadius: 6,
          }}>
            {onlineCount}/{squad.members.length} Online
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {voiceRoom?.active && (
            <span style={{
              fontSize: 11,
              color: "var(--b4-green, #10b981)",
              background: "rgba(16, 185, 129, 0.12)",
              padding: "2px 8px",
              borderRadius: 8,
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              🎙️ Voice ({activeVoiceCount})
            </span>
          )}
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--u3-text-dim, #94a3b8)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {collapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {/* Expanded Squadmate Roster */}
      {!collapsed && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}>
            {squad.members.map((member: SquadMember) => {
              const isMe = member.id === myId;
              const hasMatch = member.activity?.roomCode;

              return (
                <div
                  key={member.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: isMe ? "1px solid rgba(139, 92, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ fontSize: 16 }}>👤</span>
                      <span style={{
                        position: "absolute",
                        bottom: -1,
                        right: -1,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: member.isOnline ? "var(--b4-green, #10b981)" : "#64748b",
                        border: "1.5px solid #060a12",
                      }} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isMe ? "var(--b4-cyan, #06b6d4)" : "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {member.name} {isMe && "(You)"}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: "var(--u3-text-dim, #94a3b8)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {member.activity?.label || (member.isOnline ? "In Lounge" : "Offline")}
                      </div>
                    </div>
                  </div>

                  {hasMatch && !isMe && onJoinMatch && (
                    <button
                      className="btn sm"
                      onClick={() => onJoinMatch(member.activity!.roomCode!)}
                      style={{
                        fontSize: 10,
                        padding: "3px 8px",
                        background: "linear-gradient(135deg, var(--b4-cyan, #06b6d4), var(--b4-accent, #8b5cf6))",
                        fontWeight: 800,
                      }}
                    >
                      Join ⚡
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Tactical Controls */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 8,
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            fontSize: 11,
          }}>
            <span style={{ color: "var(--u3-text-dim, #94a3b8)" }}>
              Syndicate Trophy Rating: <b style={{ color: "var(--b4-gold, #f59e0b)" }}>{squad.trophies} 🏆</b>
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              {onToggleVoice && (
                <button
                  className="btn sm g"
                  onClick={() => onToggleVoice(!voiceRoom?.active)}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  {voiceRoom?.active ? "Leave Voice" : "🎙️ Join Voice"}
                </button>
              )}
              {onOpenSquadChat && (
                <button
                  className="btn sm"
                  onClick={onOpenSquadChat}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  Squad Comms 💬
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
