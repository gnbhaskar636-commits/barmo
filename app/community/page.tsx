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

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, room]);

  const send = () => {
    const t = text.trim();
    if (!t || Date.now() - last.current < 600) return;
    last.current = Date.now();
    sendCommunity(room, t);
    setText("");
  };

  return (
    <AppShell wide>
      <div className="pagehead u3-pagehead">
        <div>
          <span className="u3-pill-badge" style={{ marginBottom: 8, display: "inline-flex" }}>GLOBAL FREQUENCIES</span>
          <h1>Comms & Clan Chat</h1>
          <p className="hint">Real-time synchronized gaming channels, global broadcasts & tactical comms</p>
        </div>
        <div className="u3-status-cluster">
          <span className="st u3-status-badge">
            <i className={live ? "dot ok" : "dot"} />
            {live ? `${people.length + 1} gamers connected` : "Connecting to network..."}
          </span>
        </div>
      </div>

      <div className="comm u3-comm-terminal">
        <section className="pane chatpane u3-chat-pane">
          <div className="tabs2 u3-channel-tabs" role="tablist">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                role="tab"
                aria-selected={room === r.id}
                className={room === r.id ? "on" : ""}
                onClick={() => setRoom(r.id)}
              >
                <span>{r.icon}</span> #{r.name}
              </button>
            ))}
            <button className={`whobtn u3-radar-toggle ${showWho ? "on" : ""}`} onClick={() => setShowWho(!showWho)}>
              👥 Online Radar ({people.length + 1})
            </button>
          </div>

          <div className="thread big u3-thread-view" ref={log}>
            {msgs.length === 0 && (
              <div className="empty u3-empty-state">
                <span className="u3-empty-icon">📡</span>
                <b>Frequency #{room} is silent.</b>
                <p>Transmit the first message to everyone on this channel.</p>
              </div>
            )}
            {msgs.map((m) => {
              const mine = m.from === me?.id;
              return (
                <div key={m.id} className={"cm" + (mine ? " mine" : "")}>
                  <button
                    className="who2 u3-avatar-btn"
                    onClick={() => router.push("/profile?id=" + m.from)}
                    aria-label={"Open profile of " + m.name}
                  >
                    <Dot av={m.av} name={m.name} size={34} />
                  </button>
                  <div className={"mb " + (mine ? "me" : "them")}>
                    <b className="nm">{mine ? "You (Citizen)" : m.name}</b>
                    <div className="u3-msg-body">{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="compose u3-composer">
            <input
              className="inp u3-terminal-input"
              maxLength={300}
              placeholder={`Transmit to #${room}...`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn u3-btn-send" onClick={send} disabled={!text.trim()}>
              Transmit →
            </button>
          </div>
        </section>

        <aside className={"pane whopane u3-radar-pane" + (showWho ? " open" : "")}>
          <div className="u3-radar-header">
            <h3>Active Radar</h3>
            <span className="u3-pulse-dot" />
          </div>
          <div className="plist u3-radar-list">
            {me && (
              <button className="prow u3-radar-row active" onClick={() => router.push("/profile")}>
                <Dot av={me.av} name={me.name} on size={36} />
                <div className="u3-radar-meta">
                  <b>{me.name} <small>(You)</small></b>
                  <span>{me.status || "Exploring Universe"}</span>
                </div>
              </button>
            )}
            {people.map((p) => (
              <button key={p.id} className="prow u3-radar-row" onClick={() => router.push("/profile?id=" + p.id)}>
                <Dot av={p.av} name={p.name} on size={36} />
                <div className="u3-radar-meta">
                  <b>{p.name}</b>
                  <span>{p.status || "Active citizen"}</span>
                </div>
              </button>
            ))}
            {people.length === 0 && (
              <div className="empty u3-empty-subtle">
                <p>No other explorers in range. Share the BARMO portal link to invite peers.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
