"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/app/AppShell";
import AccountCard from "@/components/account/AccountCard";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { useAccount } from "@/lib/account/account";
import { AUTH_ENABLED } from "@/lib/config";
import { ITEMS, KIND_LABEL, type Item, type Kind } from "@/lib/economy/catalog";
import { getCatalogItem, STAT_SPECS } from "@/lib/progression/catalog";
import { buy, equip, leaderboard, setBoard, useWallet, type Row } from "@/lib/economy/economy";
import { play } from "@/lib/sound";
import { ItemInspectBay } from "@/components/shop/ItemInspectBay";

const GLYPH: Record<Kind, string> = { hoverboard: "▭", pet: "◉", aura: "◌" };

export default function ShopPage() {
  const toast = useToast();
  const acct = useAccount();
  const wal = useWallet();
  const { me } = useHub();
  const [tab, setTab] = useState<Kind | "all">("all");
  const [selected, setSelected] = useState<Item>(ITEMS[0]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const signedIn = !AUTH_ENABLED || !!acct.email;

  useEffect(() => {
    void leaderboard().then(setRows);
  }, [wal.earned]);

  // If currently equipped item exists, select it initially
  useEffect(() => {
    const eqHb = wal.equipped.hoverboard;
    if (eqHb) {
      const it = ITEMS.find((i) => i.id === eqHb);
      if (it) setSelected(it);
    }
  }, [wal.equipped.hoverboard]);

  const act = async (it: Item) => {
    setBusy(it.id);
    const owned = wal.owned.includes(it.id);
    const eq = wal.equipped[it.kind] === it.id;
    const err = owned ? await equip(it.id, !eq) : await buy(it.id);
    setBusy("");
    if (err) return toast(err[0].toUpperCase() + err.slice(1));
    play("pop");
    toast(
      owned
        ? eq
          ? "Unequipped from combat loadout."
          : `Equipped ${it.name}. Teleport to 3D Lounge to see it in action.`
        : `Unlocked ${it.name}! Equip it now to activate.`
    );
  };

  const scrollShelf = (dir: -1 | 1) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
    play("hover");
  };

  const list = ITEMS.filter((i) => tab === "all" || i.kind === tab);
  const selOwned = wal.owned.includes(selected.id);
  const selEq = wal.equipped[selected.kind] === selected.id;
  const selShort = selected.price - wal.tokens;
  const stats = getCatalogItem(selected.id)?.stats ?? STAT_SPECS[selected.kind];

  return (
    <AppShell>
      <div className="u3-armory-container">
        {/* Header Ribbon */}
        <div className="tk-head" style={{ marginBottom: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span className="u3-pill-badge">CYBER ARMORY 3.0</span>
              <span className="u3-pulse-dot" style={{ background: "var(--u3-cyan)" }} />
              <span style={{ fontSize: 12, color: "var(--u3-cyan)", fontWeight: 700, letterSpacing: "1px" }}>QUANTUM SYNCED</span>
            </div>
            <h1 style={{ margin: "2px 0 6px", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, letterSpacing: "-0.5px" }}>
              {"// cyber_armory"}<span className="tk-cur">_</span>
            </h1>
            <p className="tk-sub" style={{ margin: 0, maxWidth: 640 }}>
              Horizontal gear rack: Equip high-velocity hoverboards, companion AI drones, and bio-luminescent quantum auras with tokens earned across tournaments and games.
            </p>
          </div>
          <div className="tk-bal" title="Your tokens" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
            ⬡ <b>{signedIn ? wal.tokens : "--"}</b>
            <small style={{ color: "var(--u3-cyan)" }}>TOKENS</small>
          </div>
        </div>

        {AUTH_ENABLED && !signedIn && (
          <div className="tk-card">
            <h3>{"> sign_in --to earn"}</h3>
            <p className="hint">Tokens are kept on the server so they can&apos;t be edited from the browser. Sign in to start earning. Guests can still browse.</p>
            <AccountCard />
          </div>
        )}
        {signedIn && wal.err && <p className="tk-err">{wal.err}</p>}

        {/* --- 1. FEATURED 3D HOLOGRAPHIC INSPECT BAY (HORIZONTAL SPLIT) --- */}
        <div className="u3-armory-holobay">
          <ItemInspectBay item={selected} glyph={GLYPH[selected.kind]} />

          <div className="u3-holobay-info">
            <div>
              <div className="u3-holobay-tags">
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    background: selected.rarity === "epic" ? "rgba(196,92,255,0.2)" : selected.rarity === "rare" ? "rgba(94,168,255,0.2)" : "rgba(94,242,224,0.15)",
                    color: selected.rarity === "epic" ? "#d884ff" : selected.rarity === "rare" ? "#7fb9ff" : "#5ef2e0",
                    border: `1px solid ${selected.rarity === "epic" ? "rgba(196,92,255,0.5)" : selected.rarity === "rare" ? "rgba(94,168,255,0.5)" : "rgba(94,242,224,0.4)"}`,
                  }}
                >
                  [{selected.rarity}] {KIND_LABEL[selected.kind]}
                </span>
                {selEq && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--u3-cyan)", background: "rgba(6,182,212,0.15)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(6,182,212,0.4)" }}>
                    ● ACTIVE IN LOADOUT
                  </span>
                )}
                {selOwned && !selEq && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--u3-muted)", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 99 }}>
                    UNLOCKED IN VAULT
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: 26, fontWeight: 900, margin: "8px 0 4px", color: "#fff" }}>{selected.name}</h2>
              <p style={{ color: "var(--u3-muted)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>{selected.blurb}</p>
            </div>

            {/* Tactical Specs Bars */}
            <div className="u3-holobay-stats">
              <div className="u3-stat-row">
                <span>{stats.l1}</span>
                <div className="u3-stat-bar">
                  <div className="u3-stat-fill" style={{ width: `${stats.v1}%` }} />
                </div>
                <b style={{ marginLeft: 8, color: "#fff" }}>{stats.v1}%</b>
              </div>
              <div className="u3-stat-row">
                <span>{stats.l2}</span>
                <div className="u3-stat-bar">
                  <div className="u3-stat-fill" style={{ width: `${stats.v2}%`, background: "linear-gradient(90deg, #06b6d4, #10b981)" }} />
                </div>
                <b style={{ marginLeft: 8, color: "#fff" }}>{stats.v2}%</b>
              </div>
              <div className="u3-stat-row">
                <span>{stats.l3}</span>
                <div className="u3-stat-bar">
                  <div className="u3-stat-fill" style={{ width: `${stats.v3}%`, background: "linear-gradient(90deg, #8b5cf6, #ec4899)" }} />
                </div>
                <b style={{ marginLeft: 8, color: "#fff" }}>{stats.v3}%</b>
              </div>
            </div>

            {/* Primary Action Button */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button
                className={"u3-btn u3-btn-primary" + (selOwned ? " own" : "")}
                style={{
                  minHeight: 46,
                  padding: "0 28px",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  borderRadius: 12,
                  boxShadow: selEq ? "0 0 20px rgba(6,182,212,0.4)" : "0 0 24px rgba(139,92,246,0.35)",
                }}
                disabled={!signedIn || busy === selected.id || (!selOwned && selShort > 0)}
                onClick={() => void act(selected)}
              >
                {!signedIn
                  ? "Sign In to Unlock"
                  : selOwned
                  ? selEq
                    ? "✓ EQUIPPED · Tap to Unequip"
                    : "⚡ EQUIP TO COMBAT LOADOUT"
                  : selShort > 0
                  ? `Need ${selShort} more ⬡`
                  : `UNLOCK BLUEPRINT · ⬡ ${selected.price}`}
              </button>
              <div style={{ fontSize: 13, color: "var(--u3-muted)" }}>
                Cost: <b style={{ color: "var(--u3-cyan)" }}>⬡ {selected.price}</b> tokens
              </div>
            </div>
          </div>
        </div>

        {/* --- 2. ACTIVE COMBAT LOADOUT HORIZONTAL STRIP --- */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--u3-muted)", letterSpacing: "1px" }}>
              ACTIVE COMBAT LOADOUT (3 SLOTS)
            </span>
            <small style={{ color: "var(--u3-cyan)" }}>Visible in 3D Lounge & Games</small>
          </div>
          <div className="u3-loadout-ribbon">
            {(["hoverboard", "pet", "aura"] as const).map((kind) => {
              const eqId = wal.equipped[kind];
              const eqItem = eqId ? ITEMS.find((i) => i.id === eqId) : null;
              return (
                <div
                  key={kind}
                  className="u3-loadout-slot"
                  style={{
                    cursor: eqItem ? "pointer" : "default",
                    borderColor: eqItem ? "rgba(6,182,212,0.35)" : "rgba(255,255,255,0.06)",
                  }}
                  onClick={() => {
                    if (eqItem) {
                      setSelected(eqItem);
                      play("hover");
                    }
                  }}
                >
                  <div className="u3-loadout-icon" style={{ color: eqItem ? eqItem.c2 : "var(--u3-muted)" }}>
                    {GLYPH[kind]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--u3-muted)", fontWeight: 700 }}>
                      {KIND_LABEL[kind]}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: eqItem ? "#fff" : "rgba(255,255,255,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {eqItem ? eqItem.name : "Empty Slot"}
                    </div>
                  </div>
                  {eqItem && (
                    <button
                      className="btn sm g"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void act(eqItem);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* --- 3. HORIZONTAL GEAR SHELF (STREAM WITH CONTROLS) --- */}
        <div>
          <div className="u3-armory-shelf-header">
            {/* Filter Tabs */}
            <div className="tk-tabs" role="tablist" style={{ margin: 0 }}>
              {(["all", "hoverboard", "pet", "aura"] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  className={tab === k ? "on" : ""}
                  onClick={() => {
                    setTab(k);
                    play("hover");
                  }}
                >
                  {k === "all" ? "All Protocols" : KIND_LABEL[k]}
                </button>
              ))}
            </div>

            {/* Scroll buttons for PC / Desktop horizontal navigation */}
            <div className="u3-shelf-controls">
              <button className="u3-shelf-btn" onClick={() => scrollShelf(-1)} title="Scroll Left">
                ◄ PREV
              </button>
              <button className="u3-shelf-btn" onClick={() => scrollShelf(1)} title="Scroll Right">
                NEXT ►
              </button>
            </div>
          </div>

          {/* Horizontal scroll stream */}
          <div className="u3-armory-stream" ref={scrollRef}>
            {list.map((it) => {
              const owned = wal.owned.includes(it.id);
              const eq = wal.equipped[it.kind] === it.id;
              const isSel = selected.id === it.id;
              const short = it.price - wal.tokens;
              return (
                <div
                  key={it.id}
                  className={`u3-armory-item-card ${isSel ? "selected" : ""} ${eq ? "equipped" : ""}`}
                  onClick={() => {
                    setSelected(it);
                    play("hover");
                  }}
                >
                  <div
                    className="u3-card-pv"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, ${it.c2}44, ${it.c1} 75%), #0a0f1c`,
                    }}
                  >
                    <span style={{ color: it.c2, filter: "drop-shadow(0 0 10px currentColor)" }}>
                      {GLYPH[it.kind]}
                    </span>
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="tk-tag" style={{ margin: 0 }}>[{it.rarity}] {it.kind}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--u3-cyan)" }}>⬡ {it.price}</span>
                    </div>
                    <b style={{ fontSize: 15, color: "#fff" }}>{it.name}</b>
                    <small style={{ color: "var(--u3-muted)", lineHeight: 1.4 }}>{it.blurb}</small>
                  </div>

                  <button
                    className={"tk-btn" + (owned ? " own" : "")}
                    disabled={!signedIn || busy === it.id || (!owned && short > 0)}
                    onClick={(e) => {
                      e.stopPropagation();
                      void act(it);
                    }}
                    style={{ marginTop: 6 }}
                  >
                    {!signedIn
                      ? "Sign in"
                      : owned
                      ? eq
                        ? "✓ Equipped"
                        : "Equip Slot"
                      : short > 0
                      ? `Need ${short} more ⬡`
                      : `Buy · ⬡ ${it.price}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- 4. HORIZONTAL CHAMPIONS VAULT (LEADERBOARD) --- */}
        <div className="tk-card" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{"> champions_vault --top 20"}</h3>
            <span style={{ fontSize: 12, color: "var(--u3-cyan)", fontWeight: 700 }}>LIVE LEADERBOARD</span>
          </div>

          {rows === null && <p className="hint">Scanning quantum registers…</p>}
          {rows && rows.length === 0 && (
            <p className="hint">No champions registered yet. Finish quests and tournaments to be first on the leaderboard.</p>
          )}

          {rows && rows.length > 0 && (
            <div className="u3-champions-deck">
              {rows.map((r) => {
                const isMe = me && r.nm === me.name;
                const isTop1 = r.rnk === 1;
                const isTop2 = r.rnk === 2;
                const isTop3 = r.rnk === 3;
                return (
                  <div
                    key={r.rnk}
                    className={`u3-champ-card ${isTop1 ? "top1" : isTop2 ? "top2" : isTop3 ? "top3" : ""}`}
                    style={isMe ? { border: "1px solid var(--u3-accent)", background: "rgba(139,92,246,0.15)" } : {}}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 14,
                        background: isTop1 ? "#fbbf24" : isTop2 ? "#cbd5e1" : isTop3 ? "#f97316" : "rgba(255,255,255,0.08)",
                        color: isTop1 || isTop2 || isTop3 ? "#000" : "var(--u3-muted)",
                      }}
                    >
                      {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : `#${r.rnk}`}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.nm} {isMe && "(You)"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--u3-cyan)", fontWeight: 700 }}>
                        ⬡ {r.total} tokens
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {signedIn && (
            <label className="tk-chk" style={{ marginTop: 14 }}>
              <input type="checkbox" checked={wal.onBoard} onChange={(e) => void setBoard(e.target.checked)} />
              Transmit my pilot handle to the global Champions Vault
            </label>
          )}
        </div>

        <p className="hint" style={{ textAlign: "center", marginTop: 8 }}>
          {AUTH_ENABLED ? "" : "Tokens and gear are saved on this device for now. "}
          Equipped hoverboards, companion drones, and bio-auras are broadcast to all players in the 3D Lounge.
        </p>
      </div>
    </AppShell>
  );
}
