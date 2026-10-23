"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";

export default function GroupsPage() {
  const h = useHub();
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [text, setText] = useState("");
  const last = useRef(0);
  const log = useRef<HTMLDivElement>(null);

  const g = h.groups.find((x) => x.id === sel) || null;
  const msgs = g ? h.gMsgs[g.id] || [] : [];
  const members = g ? h.gMembers[g.id] || [] : [];

  useEffect(() => { log.current?.scrollTo(0, log.current.scrollHeight); }, [msgs.length, sel]);

  const create = () => {
    const id = h.createGroup(name);
    setName("");
    setSel(id);
  };
  const join = () => {
    if (!h.joinGroup(code)) { toast("Enter a valid group code"); return; }
    setSel(code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12));
    setCode("");
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
    try { await navigator.clipboard.writeText(g.id); toast("Code copied: " + g.id); } catch { toast("Code: " + g.id); }
  };

  return (
    <AppShell wide>
      <div className="pagehead"><h1>Groups</h1></div>
      <div className={"people" + (g ? " has-chat" : "")}>
        <section className="pane lst">
          <div className="gform">
            <input className="inp" maxLength={30} placeholder="New group name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
            <button className="btn sm" onClick={create}>Create</button>
          </div>
          <div className="gform">
            <input className="inp" maxLength={12} placeholder="Join with a code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} />
            <button className="btn g sm" onClick={join}>Join</button>
          </div>
          <div className="plist">
            {h.groups.length === 0 && <div className="empty">No groups yet. Create one and invite your friends, or paste a code someone sent you.</div>}
            {h.groups.map((x) => (
              <button key={x.id} className={"prow" + (sel === x.id ? " sel" : "")} onClick={() => setSel(x.id)}>
                <span className="gic">#</span>
                <span><b>{x.name}</b><small>{(h.gMembers[x.id] || []).length} online · code {x.id}</small></span>
              </button>
            ))}
          </div>
        </section>

        <section className="pane chatpane dm">
          {!g ? <div className="empty">Choose a group to open the chat.</div> : (
            <>
              <div className="dmhead">
                <button className="btn g sm back" onClick={() => setSel(null)}>← Back</button>
                <b>{g.name}</b>
                <span className="sp" />
                <button className="btn g sm" onClick={copy}>Copy code</button>
                <button className="btn g sm" onClick={() => { h.leaveGroup(g.id); setSel(null); }}>Leave</button>
              </div>
              <div className="chips">
                {members.map((m) => <span key={m.id} className="chip"><Dot av={m.av} name={m.name} size={16} /> {m.name}</span>)}
                {h.me && <span className="chip"><Dot av={h.me.av} name={h.me.name} size={16} /> You</span>}
              </div>
              {h.friends.length > 0 && (
                <div className="inv">
                  <label className="lbl" htmlFor="inv">Invite a friend</label>
                  <select id="inv" defaultValue="" onChange={(e) => { if (e.target.value) { h.inviteToGroup(g.id, e.target.value); e.target.value = ""; } }}>
                    <option value="">Choose…</option>
                    {h.friends.map((f) => <option key={f.id} value={f.id}>{f.name}{h.online[f.id] ? " (online)" : ""}</option>)}
                  </select>
                </div>
              )}
              <div className="thread big" ref={log}>
                {msgs.length === 0 && <div className="empty">No messages yet. Group chat shows messages sent while members are online.</div>}
                {msgs.map((m) => (
                  <div key={m.id} className={"mb " + (m.from === h.me?.id ? "me" : "them")}>
                    {m.from !== h.me?.id && <b className="nm">{m.name}</b>}
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="compose">
                <input className="inp" maxLength={300} placeholder={`Message ${g.name}`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
                <button className="btn" onClick={send}>Send</button>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
