"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHub } from "@/components/HubProvider";
import { AVS, hex } from "@/lib/world/avatar";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const I = {
  lounge: "M3 21V9l9-6 9 6v12M9 21v-6h6v6",
  chat: "M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  groups: "M4 6h16M4 12h16M4 18h10",
  me: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  trainer: "M12 2l3 7 7 .6-5.3 4.6 1.6 7L12 17.6 5.7 21.2l1.6-7L2 9.6 9 9z",
  games: "M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-3.9 3.1l-1.7 8A3 3 0 0 0 4 20c1 0 1.9-.6 2.4-1.5L8 16h8l1.6 2.5c.5.9 1.4 1.5 2.4 1.5a3 3 0 0 0 2.9-3.9l-1.7-8A4 4 0 0 0 17.3 5z",
  shop: "M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
};
const Ic = ({ d }: { d: string }) => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

export function enterLoungeUrl(name: string, av: string) {
  return `/world?name=${encodeURIComponent(name)}&av=${av}`;
}

export function Badge({ n }: { n: number }) {
  return n > 0 ? <b className="badge">{n > 9 ? "9+" : n}</b> : null;
}

/** Setup card shown on any app page until the visitor picks a name + avatar. */
function Setup() {
  const { saveProfile } = useHub();
  const [name, setName] = useState("");
  const [av, setAv] = useState("atlas");
  return (
    <div className="card setup">
      <h2>Welcome to BARMO</h2>
      <p className="hint">Pick a name and an avatar. No email or password needed.</p>
      <label className="lbl" htmlFor="sn">Your name</label>
      <input id="sn" className="inp" maxLength={20} placeholder="e.g. Bhaskar" value={name} onChange={(e) => setName(e.target.value)} />
      <span className="lbl">Your avatar</span>
      <div className="avr">
        {AVS.map((a) => (
          <button key={a.id} className={"avc" + (a.id === av ? " on" : "")} onClick={() => setAv(a.id)}>
            <i style={{ background: hex(a.c) }} />{a.n}
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn" disabled={!name.trim()} onClick={() => saveProfile({ name: name.trim(), av })}>Continue</button>
      </div>
    </div>
  );
}

export default function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const { ready, me, unreadNotices, unreadDMs, reqIn } = useHub();

  useEffect(() => {
    document.body.classList.add("app");
    return () => document.body.classList.remove("app");
  }, []);

  const go = (p: string) => router.push(p);
  const on = (p: string) => path === p || path.startsWith(p + "/");
  const items: { k: string; label: string; icon: string; badge?: number; to: string }[] = [
    { k: "/world", label: "Lounge", icon: I.lounge, to: me ? enterLoungeUrl(me.name, me.av) : "/" },
    { k: "/community", label: "Community", icon: I.chat, to: "/community" },
    { k: "/people", label: "People", icon: I.people, badge: reqIn.length + unreadDMs, to: "/people" },
    { k: "/groups", label: "Groups", icon: I.groups, to: "/groups" },
    { k: "/profile", label: "Me", icon: I.me, to: "/profile" },
  ];

  return (
    <>
      <nav className="nav app" aria-label="Main">
        <button className="logo" onClick={() => go("/")}>BARMO</button>
        <div className="items">
          {items.map((it) => (
            <button key={it.k} aria-current={on(it.k)} onClick={() => go(it.to)}>
              <Ic d={it.icon} />
              <span>{it.label}</span>
              <Badge n={it.badge || 0} />
            </button>
          ))}
        </div>
        <span className="sp" />
        <button className="bell" aria-label="Games" aria-current={on("/games")} onClick={() => go("/games")}>
          <Ic d={I.games} /><span>Games</span>
        </button>
        <button className="bell" aria-label="Shop" aria-current={on("/shop")} onClick={() => go("/shop")}>
          <Ic d={I.shop} /><span>Shop</span>
        </button>
        <button className="bell" aria-label="Trainer" aria-current={on("/trainer")} onClick={() => go("/trainer")}>
          <Ic d={I.trainer} /><span>Trainer</span>
        </button>
        <button className="bell" aria-label="Notifications" aria-current={on("/alerts")} onClick={() => go("/alerts")}>
          <Ic d={I.bell} /><span>Alerts</span><Badge n={unreadNotices} />
        </button>
      </nav>
      <main className={wide ? "wide" : undefined}>
        {!ready ? <p className="hint">Loading…</p> : !me ? <Setup /> : (
          <>
            {!isSupabaseConfigured() && <div className="note">Live features are off because the Supabase keys are missing in this deployment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY on Vercel and redeploy.</div>}
            {children}
          </>
        )}
      </main>
    </>
  );
}
