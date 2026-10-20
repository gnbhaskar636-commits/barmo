"use client";

import { useEffect, useState } from "react";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { useGame } from "@/components/games/useGame";
import { GAMES, type GameId } from "@/lib/games/types";
import type { Pub } from "@/lib/social/store";

export default function GameRoom({ code, host, initial, me, onLeave }: { code: string; host: boolean; initial: GameId; me: Pub; onLeave: () => void }) {
  const toast = useToast();
  const hub = useHub();
  const g = useGame(code, me, host, initial);
  const v = g.view;
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { setPicked(null); }, [v?.round, v?.game]);
  useEffect(() => {
    if (v?.phase === "play" || v?.phase === "over") hub.complete("game");
    if (v?.phase === "over" && v.winners?.includes(me.id)) hub.complete("win");
  }, [v?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); toast("Room code copied: " + code); } catch { toast("Room code: " + code); }
  };

  if (!v) return <div className="card"><p className="hint">{g.connected ? "Waiting for the host…" : "Connecting…"}</p><button className="btn g" onClick={onLeave}>Leave</button></div>;

  const players = Object.values(v.players).sort((a, b) => b.score - a.score);
  const info = GAMES.find((x) => x.id === v.game)!;
  const left = v.q ? Math.max(0, Math.ceil((v.q.dur - (now - g.recvAt)) / 1000)) : 0;
  const myRoll = v.rolls?.[me.id];
  const answered = v.answers?.[me.id] !== undefined || picked !== null;
  const tapped = v.taps?.includes(me.id) || v.early?.includes(me.id);

  return (
    <div className="gameroom">
      <div className="dmhead">
        <b>{info.icon} {info.name}</b>
        <span className="hint">Room {code}</span>
        <span className="sp" />
        <button className="btn g sm" onClick={copy}>Copy code</button>
        <button className="btn g sm" onClick={onLeave}>Leave</button>
      </div>
      {g.hostGone && <div className="note">The host seems to have left. You can leave and start a new room.</div>}

      <div className="gscore">
        {players.map((p) => (
          <div key={p.id} className={"gp" + (p.id === me.id ? " me" : "")}>
            <Dot av={p.av} name={p.name} size={30} top={p.top} />
            <b>{p.name}</b><span className="xp">{p.score}</span>
            {v.gained?.[p.id] ? <span className="plus">+{v.gained[p.id]}</span> : null}
          </div>
        ))}
      </div>

      <div className="card gstage">
        {v.phase === "lobby" && (
          <>
            <p>{info.blurb}</p>
            {host ? (
              <>
                <label htmlFor="gsel">Game</label>
                <select id="gsel" value={v.game} onChange={(e) => g.setGame(e.target.value as GameId)}>
                  {GAMES.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
                </select>
                <div className="row"><button className="btn" onClick={g.start}>Start ({players.length} player{players.length > 1 ? "s" : ""})</button></div>
                <p className="hint">Share the room code <b>{code}</b> so friends can join. You can also start alone to practice.</p>
              </>
            ) : <p className="hint">Waiting for the host to start…</p>}
          </>
        )}

        {(v.phase === "play" || v.phase === "reveal") && <div className="lbl">Round {v.round} of {v.rounds}</div>}

        {v.game === "dice" && (v.phase === "play" || v.phase === "reveal") && (
          <>
            <div className="dice">
              {players.map((p) => <div key={p.id} className="die"><small>{p.name}</small><b>{v.rolls?.[p.id] ?? "?"}</b></div>)}
            </div>
            {v.phase === "play" && !myRoll && <button className="btn big" onClick={() => g.act({ t: "roll" })}>🎲 Roll</button>}
            {v.phase === "play" && myRoll && <p className="hint">Waiting for others…</p>}
          </>
        )}

        {v.game === "quiz" && v.q && (v.phase === "play" || v.phase === "reveal") && (
          <>
            <h3>{v.q.text}</h3>
            {v.phase === "play" && <div className="hint">⏱ {left}s</div>}
            <div className="opts">
              {v.q.opts.map((o, i) => {
                const mine = v.answers?.[me.id] ?? picked;
                const cls = v.phase === "reveal" ? (i === v.correct ? " ok" : mine === i ? " bad" : "") : mine === i ? " sel" : "";
                return (
                  <button key={i} className={"opt" + cls} disabled={v.phase !== "play" || answered}
                    onClick={() => { setPicked(i); g.act({ t: "ans", i }); }}>{o}</button>
                );
              })}
            </div>
          </>
        )}

        {v.game === "race" && (v.phase === "play" || v.phase === "reveal") && (
          <>
            <button className={"racebtn " + (v.phase === "reveal" ? "done" : v.rs === "go" ? "go" : "wait")}
              disabled={v.phase !== "play" || !!tapped} onClick={() => g.act({ t: "tap" })}>
              {v.phase === "reveal" ? "Round over" : tapped ? (v.early?.includes(me.id) ? "False start!" : "Tapped!") : v.rs === "go" ? "TAP NOW" : "Wait…"}
            </button>
            {v.phase === "reveal" && v.times && (
              <div className="hint">{(v.taps || []).map((id) => `${v.players[id]?.name}: ${v.times![id]} ms`).join(" · ")}
                {(v.early || []).length ? " · False start: " + v.early!.map((id) => v.players[id]?.name).join(", ") : ""}</div>
            )}
          </>
        )}

        {v.phase === "reveal" && <p className="gmsg">{v.msg}</p>}

        {v.phase === "over" && (
          <>
            <h2>{v.winners?.includes(me.id) ? "🏆 You won!" : "Game over"}</h2>
            <p>Winner{(v.winners?.length || 0) > 1 ? "s" : ""}: {(v.winners || []).map((id) => v.players[id]?.name).join(", ")}</p>
            {host && <button className="btn" onClick={g.again}>Play again</button>}
          </>
        )}
      </div>
    </div>
  );
}
