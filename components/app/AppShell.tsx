"use client";

import { LogoMark } from "@/components/Logo";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHub } from "@/components/HubProvider";
import { useWallet } from "@/lib/economy/economy";
import { AVS, hex } from "@/lib/world/avatar";
import { loadGraphicsPreset, saveGraphicsPreset, type GraphicsPreset } from "@/lib/world/graphicsQuality";
import { play } from "@/lib/sound";
import { useProgression } from "@/lib/progression";

const I = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  games: "M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-3.9 3.1l-1.7 8A3 3 0 0 0 4 20c1 0 1.9-.6 2.4-1.5L8 16h8l1.6 2.5c.5.9 1.4 1.5 2.4 1.5a3 3 0 0 0 2.9-3.9l-1.7-8A4 4 0 0 0 17.3 5z",
  lounge: "M3 21V9l9-6 9 6v12M9 21v-6h6v6",
  explore: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.5l-4-1.5 1.5-4 4 1.5-1.5 4z",
  trophy: "M8 21h8m-4-4v4M5 4h14a2 2 0 0 1 2 2v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2zM3 6h2v2a4 4 0 0 1-2-2zm16 0h2a4 4 0 0 1-2 2V6z",
  chart: "M3 3v18h18M9 17V9m4 8V5m4 12v-5",
  trainer: "M12 2l3 7 7 .6-5.3 4.6 1.6 7L12 17.6 5.7 21.2l1.6-7L2 9.6 9 9z",
  groups: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  chat: "M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z",
  shop: "M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7",
  me: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  search: "M21 21l-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z",
};

const Ic = ({ d }: { d: string }) => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d={d} />
  </svg>
);

export function enterLoungeUrl(name: string, av: string) {
  return `/world?name=${encodeURIComponent(name)}&av=${av}`;
}

export function Badge({ n }: { n: number }) {
  return n > 0 ? <b className="b4-badge-count">{n > 9 ? "9+" : n}</b> : null;
}

export default function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const { me, unreadNotices, unreadDMs, reqIn } = useHub();
  const wal = useWallet();
  const { levelProgress } = useProgression();
  const [gfx, setGfx] = useState<GraphicsPreset>("balanced");
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    setGfx(loadGraphicsPreset());
  }, []);

  const cycleGfx = () => {
    const next: GraphicsPreset = gfx === "performance" ? "balanced" : gfx === "balanced" ? "ultra" : "performance";
    setGfx(next);
    saveGraphicsPreset(next);
    play("pop");
  };

  const go = (p: string) => {
    play("hover");
    router.push(p);
  };

  const on = (p: string) => {
    if (p === "/") return path === "/";
    return path === p || path.startsWith(p + "/");
  };

  const navGroups = [
    {
      title: "LAUNCHER & DISCOVERY",
      items: [
        { k: "/", label: "Portal Home", icon: I.home, to: "/" },
        { k: "/dashboard", label: "Gaming Dashboard", icon: I.chart, to: "/dashboard" },
        { k: "/games", label: "Game Launcher", icon: I.games, to: "/games" },
        { k: "/world", label: "3D Universe", icon: I.lounge, to: me ? enterLoungeUrl(me.name, me.av) : "/world" },
        { k: "/explore", label: "Worlds Explorer", icon: I.explore, to: "/explore" },
      ],
    },
    {
      title: "COMPETITIVE & ESPORTS",
      items: [
        { k: "/tournaments", label: "Tournaments Arena", icon: I.trophy, to: "/tournaments" },
        { k: "/leaderboard", label: "Hall of Champions", icon: I.chart, to: "/leaderboard" },
        { k: "/trainer", label: "Rewards & Training", icon: I.trainer, to: "/trainer" },
      ],
    },
    {
      title: "GUILDS & SOCIAL",
      items: [
        { k: "/groups", label: "Squads & Teams", icon: I.groups, to: "/groups" },
        { k: "/people", label: "Friends & Players", icon: I.people, badge: reqIn.length + unreadDMs, to: "/people" },
        { k: "/community", label: "Community Comms", icon: I.chat, to: "/community" },
        { k: "/shop", label: "Cyber Armory", icon: I.shop, to: "/shop" },
      ],
    },
    {
      title: "SYSTEM & IDENTITY",
      items: [
        { k: "/profile", label: "Gamer Profile", icon: I.me, to: "/profile" },
        { k: "/setup", label: "Settings & Cloud", icon: I.home, to: "/setup" },
      ],
    },
  ];

  const mobileTabs = [
    { k: "/games", label: "Games", icon: I.games, to: "/games" },
    { k: "/world", label: "Universe", icon: I.lounge, to: me ? enterLoungeUrl(me.name, me.av) : "/world" },
    { k: "/tournaments", label: "Arena", icon: I.trophy, to: "/tournaments" },
    { k: "/community", label: "Comms", icon: I.chat, to: "/community" },
    { k: "/profile", label: "Profile", icon: I.me, to: "/profile" },
  ];

  return (
    <div className="b4-shell">
      {/* 1. PERMANENT LEFT CLIENT RAIL (DESKTOP) */}
      <aside className="b4-sidebar" aria-label="Gaming Launcher Navigation">
        {/* Brand Header */}
        <div className="b4-sidebar-brand" onClick={() => go("/")} style={{ cursor: "pointer" }}>
          <div className="b4-brand-logo">
            <LogoMark size={20} />
          </div>
          <div className="b4-brand-text">
            <span>BARMO</span>
            <span className="b4-brand-sub">GAMING OS 4.0</span>
          </div>
        </div>

        {/* Categorized Navigation Groups */}
        <div className="b4-sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.title} className="b4-nav-group">
              <span className="b4-nav-header">{group.title}</span>
              {group.items.map((item) => {
                const isActive = on(item.k);
                return (
                  <button
                    key={item.k}
                    className={`b4-nav-item ${isActive ? "active" : ""}`}
                    onClick={() => go(item.to)}
                  >
                    <span className="b4-nav-icon"><Ic d={item.icon} /></span>
                    <span>{item.label}</span>
                    {item.badge !== undefined && <Badge n={item.badge} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Player Profile & Identity Footer */}
        <div className="b4-sidebar-user" onClick={() => go("/profile")} style={{ cursor: "pointer" }} title="View Profile">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--b4-cyan), var(--b4-accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 16,
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 0 10px rgba(6,182,212,0.3)",
            }}
          >
            {me?.name ? me.name.charAt(0).toUpperCase() : "B"}
          </div>
          <div className="b4-user-info">
            <span className="b4-user-name">{me?.name || "Player One"}</span>
            <span className="b4-user-rank">LEVEL {levelProgress.level} · {levelProgress.title.toUpperCase()}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go("/profile");
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--b4-text-dim)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            ⚙
          </button>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <div className="b4-body">
        {/* Master Command Topbar */}
        <header className="b4-topbar">
          {/* Quick Search */}
          <div className="b4-search-box">
            <Ic d={I.search} />
            <input
              className="b4-search-input"
              placeholder="Search games, players, tournaments…"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchVal.trim()) {
                  go(`/games?search=${encodeURIComponent(searchVal.trim())}`);
                }
              }}
            />
            <span className="b4-search-kbd">⌘K</span>
          </div>

          {/* Status & Quick Actions */}
          <div className="b4-topbar-actions">
            {/* Graphics Preset Switcher */}
            <button
              className="b4-gfx-btn"
              onClick={cycleGfx}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--b4-border)",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Toggle Graphics Settings"
            >
              <span style={{ color: "var(--b4-cyan)" }}>GFX:</span>
              <span style={{ textTransform: "capitalize" }}>{gfx}</span>
            </button>

            {/* Live Online Ping */}
            <div className="b4-online-indicator">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--b4-green)", boxShadow: "0 0 6px var(--b4-green)" }} />
              <span>LIVE</span>
            </div>

            {/* Token Currency Vault */}
            <div className="b4-vault-pill" onClick={() => go("/shop")} style={{ cursor: "pointer" }} title="Cyber Armory Vault">
              <span style={{ color: "var(--b4-cyan)" }}>⬡</span>
              <span>{wal.tokens}</span>
            </div>

            {/* Notification Bell */}
            <button
              className="b4-bell-btn"
              onClick={() => go("/alerts")}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--b4-border)",
                color: "#fff",
                width: 36,
                height: 36,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
              }}
              title="System Alerts"
            >
              <Ic d={I.bell} />
              {unreadNotices > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--b4-rose)",
                    boxShadow: "0 0 8px var(--b4-rose)",
                  }}
                />
              )}
            </button>
          </div>
        </header>

        {/* Route Viewport */}
        <main className={`b4-content ${wide ? "b4-content-wide" : ""}`}>
          {children}
        </main>
      </div>

      {/* 3. DEDICATED MOBILE CONSOLE BOTTOM DOCK */}
      <nav className="b4-mobile-dock" aria-label="Mobile Navigation">
        {mobileTabs.map((t) => {
          const isActive = on(t.k);
          return (
            <button
              key={t.k}
              className={`b4-mobile-tab ${isActive ? "active" : ""}`}
              onClick={() => go(t.to)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Ic d={t.icon} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
