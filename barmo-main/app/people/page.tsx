"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { timeAgo } from "@/lib/social/store";

function People() {
  const router = useRouter();
  const sp = useSearchParams();
  const h = useHub();
  const [tab, setTab] = useState<"online" | "friends" | "requests">("online");
  const [chat, setChat] = useState<string | null>(sp.get("chat"));
  const [text, setText] = useState("");
  const last = useRef(0);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => { if (chat) setTab("friends"); }, [chat]);
  useEffect(() => { if (chat) h.openThread(chat); }, [chat, h.threads[chat || ""]?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { log.current?.scrollTo(0, log.current.scrollHeight); }, [chat, h.threads[chat || ""]?.length]);

  const online = Object.values(h.online);
  const friend = h.friends.find((f) => f.id === chat);
  const thread = chat ? h.threads[chat] || [] : [];
  const unread = (id: string) => (h.threads[id] || []).filter((m) => m.from === id && m.ts > (h.lastRead[id] || 0)).length;
  const isFriend = (id: string) => h.friends.some((f) => f.id === id);

  const send = () => {
    const t = text.trim();
    if (!chat || !t || Date.now() - last.current < 500) return;
    last.current = Date.now();
    h.sendDM(chat, t);
    setText("");
  };

  return (
    <AppShell wide>
      <div className="pagehead"><h1>People</h1></div>
      <div className={"people" + (chat ? " has-chat" : "")}>
        <section className="pane lst">
          <div className="tabs2" role="tablist">
            <button role="tab" aria-selected={tab === "online"} onClick={() => setTab("online")}>Online ({online.length})</button>
            <button role="tab" aria-selected={tab === "friends"} onClick={() => setTab("friends")}>Friends ({h.friends.length})</button>
            <button role="tab" aria-selected={tab === "requests"} onClick={() => setTab("requests")}>Requests{h.reqIn.length ? ` (${h.reqIn.length})` : ""}</button>
          </div>

          {tab === "online" && (
            <div className="plist">
              {online.length === 0 && <div className="empty">Nobody else is online right now. Friends you add are reached the next time they open BARMO.</div>}
              {online.map((p) => (
                <div key={p.id} className="prow2">
                  <button className="prow" onClick={() => router.push("/profile?id=" + p.id)}>
                    <Dot av={p.av} name={p.name} on /> <span><b>{p.name}</b><small>{p.bio || p.status}</small></span>
                  </button>
                  {isFriend(p.id) ? (
                    <button className="btn g sm" onClick={() => { setChat(p.id); }}>Message</button>
                  ) : h.reqOut.includes(p.id) ? (
                    <span className="hint">Requested</span>
                  ) : (
                    <button className="btn sm" onClick={() => h.sendRequest(p)}>Add</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "friends" && (
            <div className="plist">
              {h.friends.length === 0 && <div className="empty">No friends yet. Tap Add on someone in Online, or tap a player in the lounge.</div>}
              {h.friends.map((f) => (
                <button key={f.id} className={"prow" + (chat === f.id ? " sel" : "")} onClick={() => setChat(f.id)}>
                  <Dot av={f.av} name={f.name} on={!!h.online[f.id]} />
                  <span><b>{f.name}</b><small>{h.online[f.id] ? "Online" : "Offline"} · {f.status}</small></span>
                  {unread(f.id) > 0 && <b className="badge static">{unread(f.id)}</b>}
                </button>
              ))}
            </div>
          )}

          {tab === "requests" && (
            <div className="plist">
              {h.reqIn.length === 0 && h.reqOut.length === 0 && <div className="empty">No pending requests.</div>}
              {h.reqIn.map((p) => (
                <div key={p.id} className="prow2">
                  <button className="prow" onClick={() => router.push("/profile?id=" + p.id)}>
                    <Dot av={p.av} name={p.name} /> <span><b>{p.name}</b><small>wants to connect</small></span>
                  </button>
                  <button className="btn sm" onClick={() => h.acceptRequest(p)}>Accept</button>
                  <button className="btn g sm" onClick={() => h.declineRequest(p.id)}>Decline</button>
                </div>
              ))}
              {h.reqOut.length > 0 && <p className="hint">Waiting for {h.reqOut.length} reply(ies). They get it the next time you are both online.</p>}
            </div>
          )}
        </section>

        <section className="pane chatpane dm">
          {!friend ? (
            <div className="empty">Pick a friend to start chatting.</div>
          ) : (
            <>
              <div className="dmhead">
                <button className="btn g sm back" onClick={() => setChat(null)}>← Back</button>
                <Dot av={friend.av} name={friend.name} on={!!h.online[friend.id]} />
                <button className="linkb" onClick={() => router.push("/profile?id=" + friend.id)}><b>{friend.name}</b></button>
                <span className="sp" />
                <button className="btn g sm" onClick={() => { h.removeFriend(friend.id); setChat(null); }}>Remove</button>
              </div>
              <div className="thread big" ref={log}>
                {thread.length === 0 && <div className="empty">Say hi to {friend.name} 👋</div>}
                {thread.map((m) => (
                  <div key={m.id} className={"mb " + (m.from === h.me?.id ? "me" : "them")}>
                    {m.text}<time>{timeAgo(m.ts)}</time>
                  </div>
                ))}
              </div>
              {!h.online[friend.id] && <p className="hint pad8">{friend.name} is offline. Your message is delivered the next time you are both online.</p>}
              <div className="compose">
                <input className="inp" maxLength={500} placeholder="Write a message…" value={text}
                  onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
                <button className="btn" onClick={send}>Send</button>
              </div>
              <p className="hint pad8">Live messaging, not end-to-end encrypted. Avoid sharing passwords or private details.</p>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function Page() {
  return <Suspense><People /></Suspense>;
}
