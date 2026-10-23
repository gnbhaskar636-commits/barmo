"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import AccountCard from "@/components/account/AccountCard";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { useAccount } from "@/lib/account/account";
import { AUTH_ENABLED } from "@/lib/config";
import { ITEMS, KIND_LABEL, type Item, type Kind } from "@/lib/economy/catalog";
import { buy, equip, leaderboard, setBoard, useWallet, type Row } from "@/lib/economy/economy";

const GLYPH: Record<Kind, string> = { hoverboard: "▭", pet: "◉", aura: "◌" };

export default function ShopPage() {
  const toast = useToast();
  const acct = useAccount();
  const wal = useWallet();
  const { me } = useHub();
  const [tab, setTab] = useState<Kind | "all">("all");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState("");
  const signedIn = !AUTH_ENABLED || !!acct.email; // login switched off: tokens live on this device

  useEffect(() => {
    void leaderboard().then(setRows);
  }, [wal.earned]);

  const act = async (it: Item) => {
    setBusy(it.id);
    const owned = wal.owned.includes(it.id);
    const eq = wal.equipped[it.kind] === it.id;
    const err = owned ? await equip(it.id, !eq) : await buy(it.id);
    setBusy("");
    if (err) return toast(err[0].toUpperCase() + err.slice(1));
    toast(owned ? (eq ? "Unequipped" : "Equipped. Walk into the lounge to see it.") : `Unlocked ${it.name}. Equip it to wear it.`);
  };

  const list = ITEMS.filter((i) => tab === "all" || i.kind === tab);

  return (
    <AppShell>
      <div className="tk">
        <div className="tk-head">
          <h1>{"// shop"}<span className="tk-cur">_</span></h1>
          <div className="tk-bal" title="Your tokens">⬡ <b>{signedIn ? wal.tokens : "--"}</b><small>tokens</small></div>
        </div>
        <p className="tk-sub">Earn tokens by finishing quests in the Trainer and with a daily login. Spend them on gear for the lounge and rooftop.</p>

        {AUTH_ENABLED && !signedIn && (
          <div className="tk-card">
            <h3>{"> sign_in --to earn"}</h3>
            <p className="hint">Tokens are kept on the server so they can&apos;t be edited from the browser. Sign in to start earning. Guests can still browse.</p>
            <AccountCard />
          </div>
        )}
        {signedIn && wal.err && <p className="tk-err">{wal.err}</p>}

        <div className="tk-tabs" role="tablist">
          {(["all", "hoverboard", "pet", "aura"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{k === "all" ? "All" : KIND_LABEL[k]}</button>
          ))}
        </div>

        <div className="tk-grid">
          {list.map((it) => {
            const owned = wal.owned.includes(it.id);
            const eq = wal.equipped[it.kind] === it.id;
            const short = it.price - wal.tokens;
            return (
              <div key={it.id} className={"tk-item " + it.rarity + (eq ? " eq" : "")}>
                <div className="tk-pv" style={{ background: `radial-gradient(circle at 30% 25%, ${it.c2}, ${it.c1} 70%)` }}><span>{GLYPH[it.kind]}</span></div>
                <div className="tk-meta">
                  <span className="tk-tag">[{it.rarity}] {it.kind}</span>
                  <b>{it.name}</b>
                  <small>{it.blurb}</small>
                </div>
                <button
                  className={"tk-btn" + (owned ? " own" : "")}
                  disabled={!signedIn || busy === it.id || (!owned && short > 0)}
                  onClick={() => void act(it)}
                >
                  {!signedIn ? "Sign in" : owned ? (eq ? "✓ Equipped · tap to remove" : "Equip") : short > 0 ? `Need ${short} more ⬡` : `Buy · ⬡ ${it.price}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="tk-card">
          <h3>{"> leaderboard --top 20"}</h3>
          {rows === null && <p className="hint">loading…</p>}
          {rows && rows.length === 0 && <p className="hint">No one is on the board yet. Finish a quest to be first.</p>}
          {rows && rows.length > 0 && (
            <div className="tk-lb" role="table">
              {rows.map((r) => (
                <div key={r.rnk} className={"tk-row" + (me && r.nm === me.name ? " me" : "")} role="row">
                  <span className="r">{String(r.rnk).padStart(2, "0")}</span>
                  <span className="n">{r.nm}</span>
                  <span className="t">⬡ {r.total}</span>
                </div>
              ))}
            </div>
          )}
          {signedIn && (
            <label className="tk-chk"><input type="checkbox" checked={wal.onBoard} onChange={(e) => void setBoard(e.target.checked)} /> Show my name on the leaderboard</label>
          )}
        </div>
        <p className="hint">{AUTH_ENABLED ? "" : "Tokens and gear are saved on this device for now (sign-in is off). "}Pets and auras are visible to other players in the lounge.</p>
      </div>
    </AppShell>
  );
}
