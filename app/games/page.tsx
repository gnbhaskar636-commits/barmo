"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import GameRoom from "@/components/games/GameRoom";
import { GameCover } from "@/components/games/GameArtwork";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { GAMES, type GameId, isValidRoomCode, getRoomShareLink } from "@/lib/games/types";
import { shortCode } from "@/lib/social/store";
import { play } from "@/lib/sound";

const GAME_SPECS: Record<GameId, { controls: string[]; lore: string; tips: string }> = {
  race: {
    controls: ["Space / Click: Critical Nitro Burn", "A/D or Drag: Slipstream Drafting", "W: Hyperdrive Surge"],
    lore: "Pilots sync quantum engines across magnetic orbital tracks. Tap the nitro burn within the sub-160ms window to trigger supersonic slipstream velocity.",
    tips: "Draft directly behind leading rivals to gain free slipstream acceleration and steal 1st position on the final turn.",
  },
  dice: {
    controls: ["Click 'Roll Quantum Core'", "Multipliers trigger on doubles & triples"],
    lore: "Forged in the cyber casinos of the High Orbit Lounge. Players calibrate magnetic dice cores under escalating round stakes.",
    tips: "Rolling a 12 triggers an instant critical jackpot payout (+50 bonus tokens).",
  },
  quiz: {
    controls: ["Click 1 of 4 holographic options", "Speed bonus adds +10 pts for < 3s answers"],
    lore: "The Nova AI neural test nexus. Questions stream real-time across computational theory, gaming lore, and physics.",
    tips: "Faster correct answers score exponentially higher round points. Trust your initial instinct.",
  },
  memory: {
    controls: ["Memorize 4-node sequence", "Tap glyphs in exact matching order"],
    lore: "An encrypted security mainframe defense matrix. Replicate recursive cyber cipher patterns under descending time limits.",
    tips: "Associate each quadrant with a directional rhythm to beat 6+ step sequences.",
  },
  cybercode: {
    controls: ["Inspect algorithmic starter bug", "Select or submit corrective patch"],
    lore: "High-octane competitive debugging. Compete head-to-head to solve algorithmic syntax puzzles before opponents patch the node.",
    tips: "Watch edge conditions: off-by-one errors and nil references cost critical penalty seconds.",
  },
};

function Lobby() {
  const sp = useSearchParams();
  const { me } = useHub();
  const toast = useToast();
  const [room, setRoom] = useState<{
    code: string;
    host: boolean;
    game: GameId;
    role?: "player" | "spectator";
    tournamentContext?: { tournamentId: string; matchId: string; round: number };
  } | null>(null);
  const [code, setCode] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<GameId>("race");
  const [filter, setFilter] = useState<"All" | "Competitive" | "Arcade" | "Skill" | "Casual">("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const j = sp.get("join");
    const s = sp.get("spectate");
    const target = (s || j || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (target && isValidRoomCode(target) && !room) {
      setRoom({
        code: target,
        host: false,
        game: "race",
        role: s ? "spectator" : "player",
      });
    }
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return null;
  if (room) {
    return (
      <GameRoom
        code={room.code}
        host={room.host}
        initial={room.game}
        me={me}
        role={room.role}
        tournamentContext={room.tournamentContext}
        onLeave={() => setRoom(null)}
      />
    );
  }

  const join = (role: "player" | "spectator" = "player") => {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (isValidRoomCode(c)) {
      play("pop");
      setRoom({ code: c, host: false, game: selectedGameId, role });
    } else {
      toast("Please enter a valid 4-8 alphanumeric Battle Code (e.g. CYBER8).");
    }
  };

  const launchSolo = (gId: GameId) => {
    play("go");
    const newCode = shortCode();
    toast(`Launching ${gId.toUpperCase()} match with AI Bot Rivals!`);
    setRoom({ code: newCode, host: true, game: gId, role: "player" });
  };

  const hostMultiplayer = (gId: GameId) => {
    play("go");
    const newCode = shortCode();
    const shareLink = getRoomShareLink(newCode);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareLink).catch(() => {});
    }
    toast(`Battle room created: ${newCode}. Invite link copied to clipboard!`);
    setRoom({ code: newCode, host: true, game: gId, role: "player" });
  };

  const filteredGames = GAMES.filter((g) => {
    const matchCat = filter === "All" || g.category === filter;
    const matchSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.blurb.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = GAMES.find((g) => g.id === selectedGameId) || GAMES[2]; // Default to Race
  const specs = GAME_SPECS[featured.id];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "var(--b4-cyan)", textTransform: "uppercase" }}>
              // SECTOR 04: ARCADE NEXUS
            </span>
            <span style={{ fontSize: 11, background: "rgba(16,185,129,0.15)", color: "var(--b4-green)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>
              ● 5 MODES ONLINE
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 900, color: "#fff", letterSpacing: -0.5, margin: 0 }}>
            Master Game Library & Launcher
          </h1>
          <p style={{ color: "var(--b4-text-muted)", fontSize: 14, margin: "6px 0 0", maxWidth: 640 }}>
            Jump into instant solo matches against autonomous AI bot rivals, host squad multiplayer battles, or compete in scheduled tournament ladders.
          </p>
        </div>

        {/* Quick Join Teleport Form */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--b4-bg-surface)", border: "1px solid var(--b4-border)", padding: "6px 8px", borderRadius: 12 }}>
          <input
            placeholder="ROOM CODE..."
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && join("player")}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "monospace",
              letterSpacing: "1px",
              padding: "6px 10px",
              outline: "none",
              width: 130,
            }}
          />
          <button
            onClick={() => join("player")}
            style={{
              background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
              border: "none",
              color: "#fff",
              fontWeight: 800,
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
            title="Join battle room as active player"
          >
            JOIN
          </button>
          <button
            onClick={() => join("spectator")}
            style={{
              background: "rgba(6,182,212,0.15)",
              border: "1px solid rgba(6,182,212,0.4)",
              color: "var(--b4-cyan)",
              fontWeight: 800,
              fontSize: 11,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
            }}
            title="Spectate battle room in real-time"
          >
            👁️ SPECTATE
          </button>
        </div>
      </div>

      {!isSupabaseConfigured() && (
        <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "var(--b4-text-muted)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span><b>Local Universe Mode:</b> Live multiplayer is running locally. You can play right now against AI Bot Rivals with zero latency!</span>
        </div>
      )}

      {/* Featured Game Spotlight Banner */}
      <div
        className="b4-hero-banner"
        style={{
          minHeight: 340,
          background: "radial-gradient(ellipse at 80% 30%, rgba(139,92,246,0.25) 0%, rgba(6,9,14,0.95) 70%), #080d18",
          borderColor: "var(--b4-border-glow)",
        }}
      >
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "55%", opacity: 0.65, pointerEvents: "none" }}>
          <GameCover id={featured.id} />
        </div>

        <div className="b4-hero-meta" style={{ position: "relative", zIndex: 3, maxWidth: 600 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: "var(--b4-accent)", color: "#fff", fontSize: 10, fontWeight: 900, textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, letterSpacing: 1 }}>
              SPOTLIGHT TITLE
            </span>
            <span style={{ color: "var(--b4-cyan)", fontSize: 12, fontWeight: 700 }}>
              ★ {featured.rating} / 5.0 Rating
            </span>
            <span style={{ color: "var(--b4-text-dim)", fontSize: 12 }}>
              · {featured.playerCount}
            </span>
          </div>

          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#fff", margin: 0, textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
            {featured.name}
          </h2>

          <p style={{ color: "var(--b4-text-muted)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
            {featured.blurb}
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => launchSolo(featured.id)}
              style={{
                background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                border: "none",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                padding: "12px 24px",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 0 24px rgba(6,182,212,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>▶</span> PLAY SOLO (WITH AI BOTS)
            </button>

            <button
              onClick={() => hostMultiplayer(featured.id)}
              style={{
                background: "var(--b4-bg-elevated)",
                border: "1px solid var(--b4-border)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "12px 20px",
                borderRadius: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚡</span> HOST SQUAD LOBBY
            </button>

            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--b4-border)",
                color: "var(--b4-text-muted)",
                fontWeight: 700,
                fontSize: 13,
                padding: "12px 18px",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              OVERVIEW & RULES
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["All", "Competitive", "Arcade", "Skill", "Casual"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: "8px 16px",
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                borderColor: filter === cat ? "var(--b4-accent)" : "var(--b4-border)",
                background: filter === cat ? "rgba(139,92,246,0.2)" : "var(--b4-bg-surface)",
                color: filter === cat ? "#fff" : "var(--b4-text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: 260 }}>
          <input
            placeholder="Search titles or genres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 16px 9px 36px",
              background: "var(--b4-bg-surface)",
              border: "1px solid var(--b4-border)",
              borderRadius: 10,
              color: "#fff",
              fontSize: 13,
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--b4-text-dim)", fontSize: 13 }}>
            🔍
          </span>
        </div>
      </div>

      {/* Game Grid with Custom Vector Artwork Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {filteredGames.map((g) => {
          const isSelected = selectedGameId === g.id;
          return (
            <div
              key={g.id}
              className="b4-game-card"
              onClick={() => {
                setSelectedGameId(g.id);
                play("pop");
              }}
              style={{
                borderColor: isSelected ? "var(--b4-border-glow)" : "var(--b4-border)",
                boxShadow: isSelected ? "0 0 24px rgba(139,92,246,0.3)" : "none",
              }}
            >
              <div className="b4-game-thumb">
                <GameCover id={g.id} />
                <span className="b4-game-badge">{g.category}</span>
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--b4-gold)",
                    background: "rgba(0,0,0,0.75)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  ★ {g.rating}
                </span>
              </div>

              <div className="b4-game-details">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="b4-game-title" style={{ margin: 0 }}>{g.name}</h3>
                  <span style={{ fontSize: 11, color: "var(--b4-text-dim)", fontWeight: 600 }}>{g.rounds} Rds</span>
                </div>
                <p className="b4-game-blurb" style={{ margin: 0 }}>{g.blurb}</p>

                <div className="b4-game-footer">
                  <span>👥 {g.playerCount}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      launchSolo(g.id);
                    }}
                    style={{
                      background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                      border: "none",
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 800,
                      padding: "5px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    PLAY NOW →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules & Control Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4,6,10,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "var(--b4-bg-surface)",
              border: "1px solid var(--b4-border-glow)",
              borderRadius: 20,
              maxWidth: 580,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ height: 160, position: "relative" }}>
              <GameCover id={featured.id} />
              <button
                onClick={() => setShowModal(false)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid var(--b4-border)",
                  color: "#fff",
                  borderRadius: 99,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-cyan)", letterSpacing: 1 }}>
                  GAME PROTOCOL SPECS
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "4px 0" }}>
                  {featured.name}
                </h3>
                <p style={{ color: "var(--b4-text-muted)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                  {specs.lore}
                </p>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--b4-border)", borderRadius: 12, padding: 14 }}>
                <b style={{ fontSize: 12, color: "#fff", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
                  🎮 Tactical Controls & Keybinds
                </b>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {specs.controls.map((ctrl, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--b4-text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--b4-accent)", fontWeight: 800 }}>▸</span>
                      <span>{ctrl}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 12, padding: 12, fontSize: 12.5, color: "var(--b4-cyan)" }}>
                💡 <b>Master Tip:</b> {specs.tips}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => {
                    setShowModal(false);
                    launchSolo(featured.id);
                  }}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                    border: "none",
                    color: "#fff",
                    fontWeight: 800,
                    padding: "12px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  PLAY SOLO NOW
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    hostMultiplayer(featured.id);
                  }}
                  style={{
                    flex: 1,
                    background: "var(--b4-bg-elevated)",
                    border: "1px solid var(--b4-border)",
                    color: "#fff",
                    fontWeight: 700,
                    padding: "12px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  HOST SQUAD MATCH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense>
        <Lobby />
      </Suspense>
    </AppShell>
  );
}
