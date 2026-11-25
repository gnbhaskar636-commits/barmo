"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import Hero3DCanvas from "@/components/Hero3DCanvas";
import { GameCover } from "@/components/games/GameArtwork";
import { runWorld } from "@/lib/world/world";
import { AVS, cfgOf, hex } from "@/lib/world/avatar";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { GAMES } from "@/lib/games/types";
import { play } from "@/lib/sound";

export default function HomeView() {
  const router = useRouter();
  const hub = useHub();
  const toast = useToast();
  const hostRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [av, setAv] = useState("atlas");
  const [claimedBounty, setClaimedBounty] = useState(false);

  // Prefill from saved profile
  useEffect(() => {
    if (hub.me) {
      setName((n) => n || hub.me!.name);
      setAv(hub.me.av);
    }
  }, [hub.me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live 3D avatar preview station in hero
  useEffect(() => {
    if (!hostRef.current) return;
    const w = runWorld(hostRef.current, {
      full: false,
      myName: name.trim() || "You",
      myCfg: cfgOf(av),
    });
    return () => w.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [av]);

  const enter = () => {
    play("go");
    const n = (name.trim() || "Commander").slice(0, 20);
    hub.saveProfile({ name: n, av });
    router.push(`/world?name=${encodeURIComponent(n)}&av=${av}`);
  };

  const claimReward = () => {
    if (claimedBounty) return;
    play("win");
    setClaimedBounty(true);
    toast("Claimed +35 Tokens for Neural Overclock Bounty! Transferred to Cyber Vault.");
  };

  const WORLDS = [
    { id: "lounge", name: "The High-Orbit Lounge", icon: "🏙️", tag: "Main Hub", desc: "Anti-gravity sky pavilion, neon coffee bar & panoramic orbital terrace." },
    { id: "meeting", name: "Tactical Meeting Hall", icon: "🤝", tag: "Spatial Conference", desc: "Hovering 10-seat command table, spatial agenda monitors & screen sharing." },
    { id: "party", name: "Cyber Club Matrix", icon: "🎉", tag: "Nightlife & Beats", desc: "Reactive laser dance platforms, sub-bass synth visualizer & 3D video wall." },
    { id: "cosmos", name: "Cosmos Zero-G Deck", icon: "🪐", tag: "Orbital Sector", desc: "Zero-gravity deep space station, asteroid belt & floating EVA astronauts." },
    { id: "lab", name: "AI Neural Code Lab", icon: "💻", tag: "Dev Speedruns", desc: "Suspended algorithm terminals, live benchmark graphs & code duels." },
  ];

  return (
    <div className="b4-home-wrapper">
      {/* Interactive 3D WebGL Background Canvas */}
      <Hero3DCanvas />

      {/* Top Navigation Bar */}
      <header className="top u3-header" style={{ position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)", background: "rgba(6,9,14,0.85)", borderBottom: "1px solid var(--b4-border)" }}>
        <div className="logo u3-logo" onClick={() => router.push("/")} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
          <LogoMark size={34} />
          <div className="u3-brand-title">
            <span style={{ fontWeight: 900, letterSpacing: "1px", color: "#fff" }}>BARMO</span>
            <small className="u3-version-pill" style={{ color: "var(--b4-cyan)", fontWeight: 800 }}>GAMING UNIVERSE</small>
          </div>
        </div>

        <div className="u3-header-nav">
          <button className="u3-nav-link" onClick={() => router.push("/games")} style={{ cursor: "pointer" }}>Play</button>
          <button className="u3-nav-link" onClick={() => router.push("/tournaments")} style={{ cursor: "pointer" }}>Tournaments</button>
          <button className="u3-nav-link" onClick={() => router.push("/explore")} style={{ cursor: "pointer" }}>Worlds</button>
          <button className="u3-nav-link" onClick={() => router.push("/shop")} style={{ cursor: "pointer" }}>Armory</button>
          <button className="u3-nav-link" onClick={() => router.push("/groups")} style={{ cursor: "pointer" }}>Squads</button>
          <button className="u3-nav-link" onClick={() => router.push("/community")} style={{ cursor: "pointer" }}>Comms</button>
        </div>

        <div className="u3-beacon-pill" style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", padding: "6px 14px", borderRadius: 99 }}>
          <span className="u3-pulse-dot" style={{ width: 8, height: 8, borderRadius: 99, background: "var(--b4-cyan)", boxShadow: "0 0 10px var(--b4-cyan)" }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "var(--b4-cyan)" }}>PLAY BEYOND LIMITS</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="b4-home-section" style={{ minHeight: "85vh", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 36, alignItems: "center" }}>
          {/* Left Column: Headline & Gateway */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", padding: "6px 14px", borderRadius: 99, width: "fit-content" }}>
              <span style={{ color: "var(--b4-accent)", fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "var(--b4-accent)", textTransform: "uppercase" }}>
                NEXT-GENERATION GAMING UNIVERSE
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(34px, 5.5vw, 56px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: -1, color: "#fff", margin: 0 }}>
              YOUR WORLD.<br />
              <span style={{ background: "linear-gradient(90deg, #fff, var(--b4-cyan))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                YOUR GAME.
              </span><br />
              YOUR LEGACY.
            </h1>

            <p style={{ fontSize: 16, color: "var(--b4-text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 540 }}>
              Discover worlds, challenge players, build your squad and experience a new generation of gaming inside BARMO.
            </p>

            {/* Quick Profile Setup Gateway */}
            <div style={{ background: "rgba(11,16,26,0.85)", border: "1px solid var(--b4-border)", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
              <div>
                <label htmlFor="pname" style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-cyan)", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                  PLAYER CALL-SIGN
                </label>
                <input
                  id="pname"
                  placeholder="Enter Call-Sign (e.g. Commander Vega)"
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enter()}
                  style={{
                    width: "100%",
                    background: "rgba(6,9,14,0.9)",
                    border: "1px solid var(--b4-border)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-text-muted)", letterSpacing: 1, display: "block", marginBottom: 8 }}>
                  COMBAT ARCHETYPE
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {AVS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setAv(a.id);
                        play("pop");
                      }}
                      style={{
                        padding: "8px 6px",
                        borderRadius: 10,
                        border: "1px solid",
                        borderColor: a.id === av ? "var(--b4-cyan)" : "var(--b4-border)",
                        background: a.id === av ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.02)",
                        color: a.id === av ? "#fff" : "var(--b4-text-muted)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: 99, background: hex(a.c) }} />
                      <span>{a.n}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  onClick={enter}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                    border: "none",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 14,
                    letterSpacing: "0.5px",
                    padding: "14px",
                    borderRadius: 12,
                    cursor: "pointer",
                    boxShadow: "0 0 24px rgba(6,182,212,0.4)",
                  }}
                >
                  PLAY NOW →
                </button>
                <button
                  onClick={() => router.push("/games")}
                  style={{
                    background: "var(--b4-bg-elevated)",
                    border: "1px solid var(--b4-border)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "14px 18px",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  EXPLORE GAMES
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live 3D Holographic Station */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 440, background: "rgba(11,16,26,0.8)", border: "1px solid var(--b4-border-glow)", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.8)" }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--b4-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--b4-green)", boxShadow: "0 0 8px var(--b4-green)" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#fff" }}>LIVE 3D RIG STATION</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-cyan)" }}>{av.toUpperCase()}</span>
              </div>

              <div ref={hostRef} style={{ height: 320, width: "100%", position: "relative" }} />

              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--b4-border)", display: "flex", justifyContent: "space-around", fontSize: 11, fontWeight: 700, color: "var(--b4-text-dim)" }}>
                <span>✦ PBR SHADING</span>
                <span>✦ ANTI-GRAV RIG</span>
                <span>✦ 60 FPS WEBGL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: FEATURED GAME SHOWCASE (Quantum Warp Grand Prix) */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">01 // SPOTLIGHT TITLE</span>
            <h2 className="b4-section-title">Quantum Warp Grand Prix</h2>
            <p className="b4-section-sub">
              Supersonic reflex racing across high-gravity magnetic tracks. Trigger sub-160ms nitro critical bursts and draft in opponent slipstreams to claim victory.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => router.push("/games")}
              style={{
                background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                border: "none",
                color: "#fff",
                fontWeight: 800,
                padding: "12px 24px",
                borderRadius: 10,
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(6,182,212,0.4)",
              }}
            >
              LAUNCH GRAND PRIX →
            </button>
          </div>
        </div>

        <div className="b4-hero-banner" style={{ minHeight: 380, borderColor: "var(--b4-border-glow)" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.75 }}>
            <GameCover id="race" />
          </div>
          <div className="b4-hero-overlay" />
          <div className="b4-hero-meta">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ background: "rgba(244,63,94,0.25)", color: "var(--b4-rose)", border: "1px solid rgba(244,63,94,0.5)", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                ● 1,420 ACTIVE RACERS
              </span>
              <span style={{ color: "var(--b4-gold)", fontSize: 12, fontWeight: 800 }}>★ 5.0 / 5.0 RATING</span>
            </div>
            <h3 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, color: "#fff", margin: 0 }}>
              Slipstream Drafting & Sub-160ms Nitro Warps
            </h3>
            <p style={{ color: "var(--b4-text-muted)", fontSize: 14, margin: 0, maxWidth: 540 }}>
              Equipped with autonomous AI Bot Rivals (Nova, Viper, Echo, Apex) so every race starts instantaneously without waiting for lobbies.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                onClick={() => router.push("/games")}
                style={{ background: "#fff", border: "none", color: "#06090e", fontWeight: 900, fontSize: 13, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}
              >
                PLAY NOW (WITH AI BOTS)
              </button>
              <button
                onClick={() => router.push("/tournaments")}
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid var(--b4-border)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8, cursor: "pointer" }}
              >
                VIEW TOURNAMENT BRACKET
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: TRENDING GAMES CAROUSEL/GRID */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">02 // GAME CATALOG</span>
            <h2 className="b4-section-title">Trending Arcade Titles</h2>
            <p className="b4-section-sub">
              Curated competitive mini-games engineered for ultra-low latency, solo bot sparring, and squad multiplayer.
            </p>
          </div>
          <button
            onClick={() => router.push("/games")}
            style={{ background: "transparent", border: "1px solid var(--b4-border)", color: "var(--b4-cyan)", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
          >
            VIEW ALL 5 TITLES →
          </button>
        </div>

        <div className="b4-home-grid-4">
          {GAMES.map((g) => (
            <div key={g.id} className="b4-game-card" onClick={() => router.push("/games")}>
              <div className="b4-game-thumb">
                <GameCover id={g.id} />
                <span className="b4-game-badge">{g.category}</span>
                <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 800, color: "var(--b4-gold)", background: "rgba(0,0,0,0.75)", padding: "3px 8px", borderRadius: 6 }}>
                  ★ {g.rating}
                </span>
              </div>
              <div className="b4-game-details">
                <h3 className="b4-game-title" style={{ margin: 0 }}>{g.name}</h3>
                <p className="b4-game-blurb" style={{ margin: 0 }}>{g.blurb}</p>
                <div className="b4-game-footer">
                  <span>👥 {g.playerCount}</span>
                  <span style={{ color: "var(--b4-accent)", fontWeight: 800 }}>PLAY →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: POPULAR MULTIPLAYER EXPERIENCES & RADAR */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">03 // LIVE SQUAD RADAR</span>
            <h2 className="b4-section-title">Active Battle Lobbies</h2>
            <p className="b4-section-sub">
              Real-time multiplayer lobbies ready for instant squad matchmaking. Join with one click or host your own.
            </p>
          </div>
        </div>

        <div className="b4-home-grid-3">
          {[
            { code: "WARP-704", title: "Quantum Warp Grand Prix", players: "8 / 12", ping: "14ms", status: "In Warmup", mode: "Supersonic" },
            { code: "DICE-912", title: "Cyber Dice High Stakes", players: "4 / 8", ping: "18ms", status: "Round 2/3", mode: "Competitive" },
            { code: "QUIZ-441", title: "Neural Blitz Speedrun", players: "11 / 16", ping: "22ms", status: "Starting in 15s", mode: "Arcade" },
          ].map((lob, i) => (
            <div key={i} className="b4-home-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-cyan)", fontFamily: "monospace" }}>
                  ROOM #{lob.code}
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(16,185,129,0.15)", color: "var(--b4-green)", padding: "3px 8px", borderRadius: 99 }}>
                  ● {lob.status}
                </span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>{lob.title}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--b4-text-muted)" }}>
                <span>👥 {lob.players} Pilots</span>
                <span>⚡ {lob.ping}</span>
                <span>🎮 {lob.mode}</span>
              </div>
              <button
                onClick={() => router.push(`/games?join=${lob.code}`)}
                style={{
                  background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 12,
                  padding: "9px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                TELEPORT IN →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: NEW GAME RELEASES & ROADMAP */}
      <section className="b4-home-section">
        <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.08))", border: "1px solid var(--b4-border)", borderRadius: 20, padding: 32 }}>
          <div className="b4-section-header">
            <div>
              <span className="b4-section-tag">04 // SEASON DROP</span>
              <h2 className="b4-section-title">Season 4: Quantum Resonance</h2>
              <p className="b4-section-sub">
                Expanded physics simulations, anti-gravity particle accelerators, and upcoming combat mini-games.
              </p>
            </div>
            <span style={{ background: "var(--b4-accent)", color: "#fff", padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
              ACTIVE SEASON
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 24 }}>
            {[
              { name: "Slipstream Drift v4.0", status: "LIVE NOW", tag: "Racing", desc: "Connected slipstream drafting physics with sub-160ms nitro critical bursts." },
              { name: "Cyber Heist (Co-op)", status: "ARRIVING NEXT FRIDAY", tag: "Co-op", desc: "4-player synchronized puzzle breach inside high-security cyber matrix banks." },
              { name: "Vortex Battle Arena", status: "IN CLOSED BETA", tag: "Esports", desc: "Zero-gravity projectile duels with spatial recoil and magnetic shields." },
            ].map((rel, i) => (
              <div key={i} style={{ background: "rgba(11,16,26,0.7)", border: "1px solid var(--b4-border)", borderRadius: 14, padding: 18 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: i === 0 ? "var(--b4-green)" : "var(--b4-cyan)", display: "block", marginBottom: 6 }}>
                  ● {rel.status}
                </span>
                <b style={{ fontSize: 16, color: "#fff", display: "block", marginBottom: 4 }}>{rel.name}</b>
                <p style={{ fontSize: 13, color: "var(--b4-text-muted)", margin: 0, lineHeight: 1.5 }}>{rel.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: COMPETITIVE TOURNAMENTS */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">05 // ESPORTS ARENA</span>
            <h2 className="b4-section-title">Championship Tournaments</h2>
            <p className="b4-section-sub">
              Automated single-elimination brackets with token prize pools and verified esports standings.
            </p>
          </div>
          <button
            onClick={() => router.push("/tournaments")}
            style={{ background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}
          >
            ENTER ARENA →
          </button>
        </div>

        <div className="b4-home-card" style={{ padding: 28, borderColor: "var(--b4-border-glow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, background: "rgba(244,63,94,0.2)", color: "var(--b4-rose)", padding: "2px 8px", borderRadius: 6 }}>
                  ● LIVE BROADCAST
                </span>
                <span style={{ fontSize: 12, color: "var(--b4-text-dim)" }}>TODAY · 20:00 UTC</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>
                Apex Cyber Dice Championship
              </h3>
              <p style={{ color: "var(--b4-text-muted)", fontSize: 14, margin: "6px 0 0" }}>
                16-Squad Single Elimination Bracket. Semifinals currently in progress.
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-gold)", display: "block" }}>PRIZE POOL</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", textShadow: "0 0 16px rgba(245,158,11,0.4)" }}>5,000 TOKENS</span>
            </div>
          </div>

          {/* Mini Bracket Preview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 20, background: "rgba(6,9,14,0.6)", borderRadius: 12, padding: 16 }}>
            <div style={{ borderLeft: "3px solid var(--b4-accent)", paddingLeft: 10 }}>
              <span style={{ fontSize: 11, color: "var(--b4-cyan)", fontWeight: 700 }}>MATCH 1 (SEMIFINAL)</span>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, marginTop: 4 }}>Commander Vega <span style={{ color: "var(--b4-green)" }}>(3)</span></div>
              <div style={{ fontSize: 13, color: "var(--b4-text-dim)" }}>CyberViper (2)</div>
            </div>
            <div style={{ borderLeft: "3px solid var(--b4-accent)", paddingLeft: 10 }}>
              <span style={{ fontSize: 11, color: "var(--b4-cyan)", fontWeight: 700 }}>MATCH 2 (SEMIFINAL)</span>
              <div style={{ fontSize: 13, color: "var(--b4-text-dim)", marginTop: 4 }}>Quantum_Ace (1)</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>GlitchHunter <span style={{ color: "var(--b4-green)" }}>(3)</span></div>
            </div>
            <div style={{ borderLeft: "3px solid var(--b4-gold)", paddingLeft: 10 }}>
              <span style={{ fontSize: 11, color: "var(--b4-gold)", fontWeight: 700 }}>GRAND FINALS</span>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 800, marginTop: 4 }}>Commander Vega</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 800 }}>vs GlitchHunter</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: GAMING COMMUNITIES & CLANS */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">06 // SQUADS & CLANS</span>
            <h2 className="b4-section-title">Elite Syndicates</h2>
            <p className="b4-section-sub">
              Squad up with competitive gaming clans, coordinate spatial voice comms, and conquer seasonal clan wars.
            </p>
          </div>
          <button
            onClick={() => router.push("/groups")}
            style={{ background: "transparent", border: "1px solid var(--b4-border)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
          >
            VIEW ALL SQUADS →
          </button>
        </div>

        <div className="b4-home-grid-3">
          {[
            { name: "Apex Syndicate", tag: "APEX", members: 1420, winRate: "76%", rank: "Tier 1 Clan", icon: "⚡" },
            { name: "Neon Drift Club", tag: "DRIFT", members: 980, winRate: "69%", rank: "Speed Kings", icon: "🏎️" },
            { name: "Cyber Knights", tag: "KNIGHT", members: 1150, winRate: "72%", rank: "Defense Matrix", icon: "🛡️" },
          ].map((clan, i) => (
            <div key={i} className="b4-home-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 24 }}>{clan.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(139,92,246,0.2)", color: "var(--b4-accent)", padding: "2px 8px", borderRadius: 99 }}>
                  [{clan.tag}]
                </span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: 0 }}>{clan.name}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--b4-text-muted)" }}>
                <span>👥 {clan.members} Members</span>
                <span style={{ color: "var(--b4-green)", fontWeight: 700 }}>{clan.winRate} Win Rate</span>
              </div>
              <button
                onClick={() => router.push("/groups")}
                style={{
                  background: "var(--b4-bg-elevated)",
                  border: "1px solid var(--b4-border)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                JOIN SYNDICATE
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7: HALL OF CHAMPIONS (TOP PLAYERS PODIUM) */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">07 // HALL OF CHAMPIONS</span>
            <h2 className="b4-section-title">Seasonal Leaderboard</h2>
            <p className="b4-section-sub">
              Top-ranked pilots across all arcade titles and competitive tournament brackets.
            </p>
          </div>
          <button
            onClick={() => router.push("/leaderboard")}
            style={{ background: "transparent", border: "1px solid var(--b4-border)", color: "var(--b4-gold)", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
          >
            GLOBAL RANKINGS →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "flex-end" }}>
          {/* #2 Rank */}
          <div className="b4-podium-card rank-2">
            <span style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", letterSpacing: 1 }}>RANK #2 · MASTER</span>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: "linear-gradient(135deg, #94a3b8, #475569)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff", boxShadow: "0 0 20px rgba(148,163,184,0.4)" }}>
              C
            </div>
            <b style={{ fontSize: 18, color: "#fff" }}>Cipher_99</b>
            <div style={{ fontSize: 13, color: "var(--b4-cyan)", fontWeight: 700 }}>3,850 Tokens</div>
            <div style={{ fontSize: 12, color: "var(--b4-text-dim)" }}>118 Wins · 86% Reflex Rate</div>
          </div>

          {/* #1 Rank (Grandmaster) */}
          <div className="b4-podium-card rank-1" style={{ padding: "32px 24px" }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "var(--b4-gold)", letterSpacing: 1.5 }}>
              👑 RANK #1 · GRANDMASTER
            </span>
            <div style={{ width: 80, height: 80, borderRadius: 99, background: "linear-gradient(135deg, #f59e0b, #b45309)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", boxShadow: "0 0 30px rgba(245,158,11,0.6)" }}>
              V
            </div>
            <b style={{ fontSize: 22, color: "#fff" }}>Commander Vega</b>
            <div style={{ fontSize: 16, color: "var(--b4-gold)", fontWeight: 900 }}>4,920 Tokens</div>
            <div style={{ fontSize: 12, color: "var(--b4-text-dim)" }}>142 Wins · 94% Precision Rate</div>
          </div>

          {/* #3 Rank */}
          <div className="b4-podium-card rank-3">
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--b4-rose)", letterSpacing: 1 }}>RANK #3 · DIAMOND</span>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: "linear-gradient(135deg, #f43f5e, #be123c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff", boxShadow: "0 0 20px rgba(244,63,94,0.4)" }}>
              L
            </div>
            <b style={{ fontSize: 18, color: "#fff" }}>Lyra_Valkyrie</b>
            <div style={{ fontSize: 13, color: "var(--b4-cyan)", fontWeight: 700 }}>3,420 Tokens</div>
            <div style={{ fontSize: 12, color: "var(--b4-text-dim)" }}>104 Wins · 82% Reflex Rate</div>
          </div>
        </div>
      </section>

      {/* SECTION 8: FEATURED 3D METAVERSE WORLDS */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">08 // 3D METAVERSE REALMS</span>
            <h2 className="b4-section-title">Explore Spatial Worlds</h2>
            <p className="b4-section-sub">
              Anti-gravity environments powered by Three.js WebGL with spatial voice, real-time avatar interaction, and customizable soundscapes.
            </p>
          </div>
          <button
            onClick={() => router.push("/explore")}
            style={{ background: "transparent", border: "1px solid var(--b4-border)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
          >
            DISCOVER ALL WORLDS →
          </button>
        </div>

        <div className="b4-home-grid-3">
          {WORLDS.map((w) => (
            <div key={w.id} className="b4-home-card" style={{ cursor: "pointer" }} onClick={() => router.push(`/world?room=${w.id}`)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 32 }}>{w.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(6,182,212,0.15)", color: "var(--b4-cyan)", padding: "2px 8px", borderRadius: 99 }}>
                  {w.tag}
                </span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: 0 }}>{w.name}</h3>
              <p style={{ fontSize: 13, color: "var(--b4-text-muted)", margin: 0, lineHeight: 1.5 }}>{w.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--b4-text-dim)" }}>Spatial 3D Audio Active</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-cyan)" }}>TELEPORT →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 9: DAILY CHALLENGES & BOUNTY BOARD */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">09 // BOUNTY BOARD</span>
            <h2 className="b4-section-title">Daily Missions & Rewards</h2>
            <p className="b4-section-sub">
              Complete tactical bounties every 24 hours to earn tokens, unlock legendary hoverboards, and level up your combat rank.
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--b4-text-muted)" }}>
            ⏳ Resets in 05:42:18
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="b4-challenge-item">
            <div>
              <b style={{ fontSize: 15, color: "#fff", display: "block" }}>Supersonic Ace: Win 3 Quantum Warp races</b>
              <span style={{ fontSize: 12, color: "var(--b4-text-muted)" }}>Trigger slipstream drafting 5 times across any match</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="b4-progress-bar">
                <div className="b4-progress-fill" style={{ width: "66%" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>2 / 3</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--b4-gold)" }}>+50 TOKENS</span>
            </div>
          </div>

          <div className="b4-challenge-item" style={{ borderColor: claimedBounty ? "var(--b4-border)" : "var(--b4-border-glow)" }}>
            <div>
              <b style={{ fontSize: 15, color: "#fff", display: "block" }}>Neural Overclock: Score 80%+ in Neural Quiz Arena</b>
              <span style={{ fontSize: 12, color: "var(--b4-text-muted)" }}>Answer 4 consecutive speed-trivia questions correctly</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="b4-progress-bar">
                <div className="b4-progress-fill" style={{ width: "100%", background: "var(--b4-green)" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--b4-green)" }}>100%</span>
              <button
                onClick={claimReward}
                disabled={claimedBounty}
                style={{
                  background: claimedBounty ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                  border: "none",
                  color: claimedBounty ? "var(--b4-text-dim)" : "#fff",
                  fontWeight: 800,
                  fontSize: 12,
                  padding: "8px 16px",
                  borderRadius: 8,
                  cursor: claimedBounty ? "default" : "pointer",
                }}
              >
                {claimedBounty ? "CLAIMED" : "CLAIM +35 ⚡"}
              </button>
            </div>
          </div>

          <div className="b4-challenge-item">
            <div>
              <b style={{ fontSize: 15, color: "#fff", display: "block" }}>High-Roller: Trigger a Double-6 in Cyber Dice Duel</b>
              <span style={{ fontSize: 12, color: "var(--b4-text-muted)" }}>Roll against any player or autonomous AI rival</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="b4-progress-bar">
                <div className="b4-progress-fill" style={{ width: "0%" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--b4-text-dim)" }}>0 / 1</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--b4-gold)" }}>+25 TOKENS</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: PLAYER REWARDS & CYBER ARMORY PREVIEW */}
      <section className="b4-home-section">
        <div className="b4-section-header">
          <div>
            <span className="b4-section-tag">10 // CYBER ARMORY</span>
            <h2 className="b4-section-title">Equip Legendary 3D Cybernetics</h2>
            <p className="b4-section-sub">
              Unlock levitating anti-gravity hoverboards, AI companion scout pets, and glowing bio-auras to equip on your avatar.
            </p>
          </div>
          <button
            onClick={() => router.push("/shop")}
            style={{ background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}
          >
            ENTER CYBER ARMORY →
          </button>
        </div>

        <div className="b4-home-grid-3">
          {[
            { name: "Terminal Hoverboard", kind: "HOVERBOARD", rarity: "COMMON", cost: "50 Tokens", color: "#10b981", desc: "Phosphor-green deck with single ion thruster. Boots directly into a cyber shell." },
            { name: "Gradient Descent", kind: "HOVERBOARD", rarity: "RARE", cost: "95 Tokens", color: "#8b5cf6", desc: "Purple-to-blue gradient body with dual anti-gravity stabilizer coils." },
            { name: "Companion Drone Sparky", kind: "AI PET", rarity: "LEGENDARY", cost: "140 Tokens", color: "#06b6d4", desc: "Autonomous hovering scout drone that tracks your 3D avatar position." },
          ].map((item, i) => (
            <div key={i} className="b4-home-card" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: item.color, border: `1px solid ${item.color}55`, padding: "2px 8px", borderRadius: 99 }}>
                  [{item.rarity}] {item.kind}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--b4-gold)" }}>{item.cost}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: "4px 0" }}>{item.name}</h3>
              <p style={{ fontSize: 13, color: "var(--b4-text-muted)", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              <button
                onClick={() => router.push("/shop")}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--b4-border)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                INSPECT IN 3D BAY →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 11: DOWNLOAD BARMO SECTION */}
      <section className="b4-home-section" style={{ paddingBottom: 96 }}>
        <div className="b4-download-box">
          <div style={{ maxWidth: 600 }}>
            <span className="b4-section-tag" style={{ color: "var(--b4-accent)" }}>11 // NATIVE EXPERIENCE</span>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#fff", margin: "8px 0 12px" }}>
              Play Beyond Limits Anywhere.
            </h2>
            <p style={{ color: "var(--b4-text-muted)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              Available as a progressive web application (PWA) with offline asset caching, or run directly in any modern desktop and mobile browser with zero installation needed.
            </p>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/games")}
              style={{
                background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
                border: "none",
                color: "#fff",
                fontWeight: 900,
                fontSize: 14,
                padding: "16px 32px",
                borderRadius: 14,
                cursor: "pointer",
                boxShadow: "0 0 30px rgba(6,182,212,0.4)",
              }}
            >
              LAUNCH WEB CLIENT 🎮
            </button>
            <button
              onClick={() => toast("PWA is already enabled in this build! Use browser 'Install App' icon in URL bar.")}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--b4-border)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "16px 24px",
                borderRadius: 14,
                cursor: "pointer",
              }}
            >
              INSTALL PWA CLIENT 📲
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Footer */}
      <footer style={{ borderTop: "1px solid var(--b4-border)", padding: "32px 24px 80px", maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark size={28} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--b4-text-muted)" }}>
            BARMO 4.0 — THE ULTIMATE GAMING UNIVERSE
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--b4-text-dim)" }}>
          © 2026 BARMO Corp. All quantum rights reserved. Built with Next.js 15, Three.js & WebGL.
        </div>
      </footer>
    </div>
  );
}
