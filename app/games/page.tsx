"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import GameRoom from "@/components/games/GameRoom";
import { useHub } from "@/components/HubProvider";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { GAMES, type GameId } from "@/lib/games/types";
import { shortCode } from "@/lib/social/store";

function Lobby() {
  const sp = useSearchParams();
  const { me } = useHub();
  const [room, setRoom] = useState<{ code: string; host: boolean; game: GameId } | null>(null);
  const [code, setCode] = useState("");
  const [game, setGame] = useState<GameId>("dice");

  useEffect(() => {
    const j = sp.get("join");
    if (j && !room) setRoom({ code: j.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8), host: false, game: "dice" });
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return null;
  if (room) return <GameRoom code={room.code} host={room.host} initial={room.game} me={me} onLeave={() => setRoom(null)} />;

  const join = () => {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (c.length >= 4) setRoom({ code: c, host: false, game: "dice" });
  };

  return (
    <>
      <div className="pagehead"><h1>Mini-games</h1></div>
      {!isSupabaseConfigured() && <div className="note">Multiplayer needs the Supabase keys on this deployment.</div>}
      <div className="qgrid">
        {GAMES.map((x) => (
          <button key={x.id} className={"card gcard" + (game === x.id ? " on" : "")} onClick={() => setGame(x.id)}>
            <div className="gi">{x.icon}</div><b>{x.name}</b><small className="hint">{x.blurb}</small>
          </button>
        ))}
      </div>
      <div className="row"><button className="btn" onClick={() => setRoom({ code: shortCode(), host: true, game })}>Create a room</button></div>
      <h3 className="sech">Join a friend</h3>
      <div className="gform" style={{ maxWidth: 360 }}>
        <input className="inp" placeholder="Room code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} />
        <button className="btn g" onClick={join}>Join</button>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense><Lobby /></Suspense>
    </AppShell>
  );
}
