"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import SquadRadar from "@/components/social/SquadRadar";
import type { Squad, SquadMember } from "@/lib/social/types";

export default function GroupsPage() {
  const h = useHub();
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const last = useRef(0);
  const log = useRef<HTMLDivElement>(null);

  const g = h.groups.find((x) => x.id === sel) || null;
  const msgs = g ? h.gMsgs[g.id] || [] : [];
  const members = g ? h.gMembers[g.id] || [] : [];

  const currentSquad: Squad | null = g
    ? {
        id: g.id,
        name: g.name,
        tag: `[${g.name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "") || "SQ"}]`,
        description: "Tactical Syndicate Operatives",
        leaderId: members[0]?.id || h.me?.id || "leader",
        members: members.map((m, idx) => ({
          id: m.id,
          name: m.name,
          av: m.av,
          role: idx === 0 ? "leader" : idx === 1 ? "officer" : "member",
          joinedAt: Date.now() - idx * 3600000,
          isOnline: true,
          activity: {
            type: "idle",
            label: "In Syndicate Lounge",
            startedAt: Date.now(),
          },
        })),
        memberCount: Math.min(members.length, 8),
        capacity: 8,
        maxMembers: 8,
        isOpen: true,
        trophies: 2450,
        createdAt: g.joined || Date.now(),
        voiceRoom: {
          roomId: `squad-voice-${g.id}`,
          active: voiceActive,
          activeSpeakers: voiceActive ? [h.me?.id || "me"] : [],
          participants: {},
        },
      }
    : null;

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, sel]);

  const create = () => {
    if (!name.trim()) return;
    const id = h.createGroup(name);
    setName("");
    setSel(id);
    toast("Guild established!");
  };

  const join = () => {
    if (!h.joinGroup(code)) {
      toast("Enter a valid frequency code");
      return;
    }
    setSel(code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12));
    setCode("");
    toast("Joined frequency!");
  };

  const send = () => {
    const t = text.trim();
    if (!g || !t || Date.now() - last.current < 500) return;
    last.current = Date.now();
    h.sendGroup(g.id, t);
    setText("");
  };

  const copy = async () => {
    if (!g) return;
    try {
      await navigator.clipboard.writeText(g.id);
      toast("Frequency code copied: " + g.id);
    } catch {
      toast("Code: " + g.id);
    }
  };

  return (
    <AppShell wide>
      <div className="pagehead u3-pagehead">
        <div>
          <span className="u3-pill-badge" style={{ marginBottom: 8, display: "inline-flex" }}>SQUAD NETWORK</span>
          <h1>Gaming Squads & Clans</h1>
          <p className="hint" style={{ color: "var(--u3-text-dim)" }}>Collaborative combat squads, competitive clans, and private tactical tactical channels</p>
        </div>
      </div>

      <div className={"people u3-people-container" + (g ? " has-chat" : "")}>
        {/* Left Side: Groups List & Creation */}
        <section className="pane lst u3-people-list-pane">
          <div className="card u3-create-group-card">
            <h3>✦ Form a Spatial Guild</h3>
            <div className="row2" style={{ marginTop: 8 }}>
              <input
                className="inp grow"
                placeholder="Guild name (e.g. Cyber Pioneers)"
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
              <button className="btn" onClick={create} disabled={!name.trim()}>Create</button>
            </div>
            <div className="row2" style={{ marginTop: 10 }}>
              <input
                className="inp grow"
                placeholder="Frequency Code"
                maxLength={12}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && join()}
              />
              <button className="btn g" onClick={join}>Link Code</button>
            </div>
          </div>

          <div className="plist u3-cards-list">
            {h.groups.length === 0 && (
              <div className="empty u3-empty-state">
                <span className="u3-empty-icon">🛡️</span>
                <b>You have not joined any guilds yet.</b>
                <p>Create a guild above or enter a friend&apos;s frequency code.</p>
              </div>
            )}
            {h.groups.map((item) => (
              <div
                key={item.id}
                className={"card u3-person-card" + (sel === item.id ? " active-link" : "")}
                onClick={() => setSel(item.id)}
                role="button"
                tabIndex={0}
              >
                <div className="u3-guild-badge">🛡️</div>
                <div className="grow u3-person-info">
                  <b>{item.name}</b>
                  <small className="hint">Code: {item.id}</small>
                </div>
                <button className="btn sm">Channel →</button>
              </div>
            ))}
          </div>
        </section>

        {/* Right Side: Guild Chat & Members */}
        {g && (
          <section className="pane chatpane u3-chat-pane">
            <div className="dmhead u3-dm-header">
              <button className="btn g sm back" onClick={() => setSel(null)}>← Back</button>
              <b>{g.name}</b>
              <button className="btn g sm" onClick={copy}>Share Code</button>
              <small className="hint">👥 {Math.min(members.length, 8)}/8 Operatives</small>
            </div>

            {currentSquad && (
              <div style={{ padding: "8px 12px 0" }}>
                <SquadRadar
                  squad={currentSquad}
                  myId={h.me?.id}
                  onToggleVoice={(act) => {
                    setVoiceActive(act);
                    toast(act ? "Connected to Spatial SFU Voice Room 🎙️" : "Disconnected from voice");
                  }}
                />
              </div>
            )}

            <div className="thread u3-thread-view" ref={log}>
              {msgs.length === 0 && (
                <div className="empty u3-empty-state">
                  <p>Guild channel created. Start planning your spatial ventures!</p>
                </div>
              )}
              {msgs.map((m) => {
                const mine = m.from === h.me?.id;
                return (
                  <div key={m.id} className={"cm" + (mine ? " mine" : "")}>
                    <div className={"mb " + (mine ? "me" : "them")}>
                      <b className="nm">{mine ? "You" : m.name}</b>
                      <div>{m.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="compose u3-composer">
              <input
                className="inp u3-terminal-input"
                maxLength={300}
                placeholder={`Broadcast to ${g.name}...`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn u3-btn-send" onClick={send} disabled={!text.trim()}>
                Broadcast →
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
