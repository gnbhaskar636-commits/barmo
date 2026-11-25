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
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }); }, [chat, h.threads[chat || ""]?.length]);

  const online = Object.values(h.online);
  const friend = h.friends.find((f) => f.id === chat);
  const thread = chat ? h.threads[chat] || [] : [];
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
      <div className="pagehead u3-pagehead">
        <div>
          <span className="u3-pill-badge" style={{ marginBottom: 8, display: "inline-flex" }}>PLAYER RADAR</span>
          <h1>Player Network & Rivals</h1>
          <p className="hint">Discover active competitors, connect with squadmates & initiate direct tactical transmissions</p>
        </div>
      </div>

      <div className={"people u3-people-container" + (chat ? " has-chat" : "")}>
        <section className="pane lst u3-people-list-pane">
          <div className="tabs2 u3-channel-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "online"} className={tab === "online" ? "on" : ""} onClick={() => setTab("online")}>
              🌐 Online ({online.length})
            </button>
            <button role="tab" aria-selected={tab === "friends"} className={tab === "friends" ? "on" : ""} onClick={() => setTab("friends")}>
              🤝 Peer Links ({h.friends.length})
            </button>
            <button role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "on" : ""} onClick={() => setTab("requests")}>
              📬 Transmissions{h.reqIn.length ? ` (${h.reqIn.length})` : ""}
            </button>
          </div>

          {tab === "online" && (
            <div className="plist u3-cards-list">
              {online.length === 0 && (
                <div className="empty u3-empty-state">
                  <span className="u3-empty-icon">🛰️</span>
                  <b>No other explorers active right now.</b>
                  <p>Invite friends to explore the 3D Universe together.</p>
                </div>
              )}
              {online.map((p) => (
                <div key={p.id} className="card u3-person-card">
                  <Dot av={p.av} name={p.name} on size={44} />
                  <div className="grow u3-person-info">
                    <b>{p.name}</b>
                    <small className="u3-status-line">{p.status || "Exploring"}</small>
                  </div>
                  <div className="row2 u3-card-actions">
                    <button className="btn g sm" onClick={() => router.push("/profile?id=" + p.id)}>
                      Profile
                    </button>
                    {isFriend(p.id) ? (
                      <button className="btn sm" onClick={() => setChat(p.id)}>Direct Msg</button>
                    ) : (
                      <button className="btn sm" onClick={() => h.sendRequest(p)}>Connect</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "friends" && (
            <div className="plist u3-cards-list">
              {h.friends.length === 0 && (
                <div className="empty u3-empty-state">
                  <span className="u3-empty-icon">🤝</span>
                  <b>No Peer Links established yet.</b>
                  <p>Connect with explorers in the Online tab or in 3D worlds.</p>
                </div>
              )}
              {h.friends.map((f) => (
                <div key={f.id} className={"card u3-person-card" + (chat === f.id ? " active-link" : "")}>
                  <Dot av={f.av} name={f.name} on={!!h.online[f.id]} size={44} />
                  <div className="grow u3-person-info">
                    <b>{f.name}</b>
                    <small className="u3-status-line">{h.online[f.id] ? "Online now" : "Offline"}</small>
                  </div>
                  <div className="row2 u3-card-actions">
                    <button className="btn g sm" onClick={() => router.push("/profile?id=" + f.id)}>Profile</button>
                    <button className="btn sm" onClick={() => setChat(f.id)}>Direct Msg</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "requests" && (
            <div className="plist u3-cards-list">
              {h.reqIn.length === 0 && (
                <div className="empty u3-empty-state">
                  <span className="u3-empty-icon">📬</span>
                  <b>No pending transmission requests.</b>
                </div>
              )}
              {h.reqIn.map((r) => (
                <div key={r.id} className="card u3-person-card">
                  <Dot av={r.av} name={r.name} size={44} />
                  <div className="grow u3-person-info">
                    <b>{r.name}</b>
                    <small className="hint">Wants to link frequency</small>
                  </div>
                  <div className="row2 u3-card-actions">
                    <button className="btn sm" onClick={() => h.acceptRequest(r)}>Accept</button>
                    <button className="btn g sm" onClick={() => h.declineRequest(r.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Direct Transmission Chat Pane */}
        {chat && (
          <section className="pane chatpane u3-chat-pane">
            <div className="dmhead u3-dm-header">
              <button className="btn g sm back" onClick={() => setChat(null)}>← Back</button>
              <b>Direct Link: {friend ? friend.name : "Explorer"}</b>
            </div>

            <div className="thread u3-thread-view" ref={log}>
              {thread.length === 0 && (
                <div className="empty u3-empty-state">
                  <p>Encrypted frequency established. Transmit a hello!</p>
                </div>
              )}
              {thread.map((m) => {
                const mine = m.from === h.me?.id;
                return (
                  <div key={m.id} className={"cm" + (mine ? " mine" : "")}>
                    <div className={"mb " + (mine ? "me" : "them")}>
                      <div>{m.text}</div>
                      <small className="u3-msg-time">{timeAgo(m.ts)}</small>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="compose u3-composer">
              <input
                className="inp u3-terminal-input"
                maxLength={300}
                placeholder="Direct transmission..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn u3-btn-send" onClick={send} disabled={!text.trim()}>
                Send →
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

export default function PeoplePage() {
  return (
    <Suspense>
      <People />
    </Suspense>
  );
}
