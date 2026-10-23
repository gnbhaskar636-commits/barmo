"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { ROOMS } from "@/lib/social/store";

export default function CommunityPage() {
  const router = useRouter();
  const { me, online, cMsgs, sendCommunity, live } = useHub();
  const [room, setRoom] = useState("general");
  const [text, setText] = useState("");
  const [showWho, setShowWho] = useState(false);
  const last = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const msgs = cMsgs[room] || [];
  const people = Object.values(online);

  useEffect(() => { log.current?.scrollTo(0, log.current.scrollHeight); }, [msgs.length, room]);

  const send = () => {
    const t = text.trim();
    if (!t || Date.now() - last.current < 600) return;
    last.current = Date.now();
    sendCommunity(room, t);
    setText("");
  };

  return (
    <AppShell wide>
      <div className="pagehead">
        <h1>Community</h1>
        <span className="st"><i className={live ? "dot ok" : "dot"} />{live ? `${people.length + 1} online` : "Connecting…"}</span>
      </div>
      <div className="comm">
        <section className="pane chatpane">
          <div className="tabs2" role="tablist">
            {ROOMS.map((r) => (
              <button key={r.id} role="tab" aria-selected={room === r.id} onClick={() => setRoom(r.id)}>{r.icon} {r.name}</button>
            ))}
            <button className="whobtn" onClick={() => setShowWho(!showWho)}>👥 {people.length + 1}</button>
          </div>
          <div className="thread big" ref={log}>
            {msgs.length === 0 && <div className="empty">No messages in this room yet. Say hello 👋</div>}
            {msgs.map((m) => {
              const mine = m.from === me?.id;
              return (
                <div key={m.id} className={"cm" + (mine ? " mine" : "")}>
                  <button className="who2" onClick={() => router.push("/profile?id=" + m.from)} aria-label={"Open profile of " + m.name}>
                    <Dot av={m.av} name={m.name} size={30} />
                  </button>
                  <div className={"mb " + (mine ? "me" : "them")}>
                    <b className="nm">{mine ? "You" : m.name}</b>
                    <div>{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="compose">
            <input className="inp" maxLength={300} placeholder={`Message #${room}`} value={text}
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <button className="btn" onClick={send}>Send</button>
          </div>
        </section>
        <aside className={"pane whopane" + (showWho ? " open" : "")}>
          <h3>Online now</h3>
          <div className="plist">
            {me && (
              <button className="prow" onClick={() => router.push("/profile")}>
                <Dot av={me.av} name={me.name} on /> <span><b>{me.name}</b> (you)<small>{me.status}</small></span>
              </button>
            )}
            {people.map((p) => (
              <button key={p.id} className="prow" onClick={() => router.push("/profile?id=" + p.id)}>
                <Dot av={p.av} name={p.name} on /> <span><b>{p.name}</b><small>{p.status}</small></span>
              </button>
            ))}
            {people.length === 0 && <p className="hint">Nobody else is here yet. Share the link and invite a friend.</p>}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
