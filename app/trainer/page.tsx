"use client";

import { useRouter } from "next/navigation";
import AppShell, { enterLoungeUrl } from "@/components/app/AppShell";
import { useHub } from "@/components/HubProvider";
import { QUESTS, levelOf, levelTitle } from "@/lib/social/quests";

export default function TrainerPage() {
  const router = useRouter();
  const { quests, me } = useHub();
  const lvl = levelOf(quests.xp);
  const into = quests.xp % 100;
  const done = QUESTS.filter((q) => quests.done[q.id]).length;
  const next = QUESTS.find((q) => !quests.done[q.id]);
  const groups = ["Basics", "Lounge", "Worlds", "Social"] as const;

  return (
    <AppShell>
      <div className="pagehead">
        <span className="u3-pill-badge" style={{ marginBottom: 8, display: "inline-flex" }}>ACADEMY 3.0</span>
        <h1>Spatial Mastery Trainer</h1>
        <p className="hint" style={{ color: "var(--u3-text-dim)", maxWidth: 640 }}>Level up your spatial capabilities, unlock anti-gravity gear rewards, and master the multi-world universe.</p>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => router.push(me ? enterLoungeUrl(me.name, me.av) : "/")} style={{
            background: "linear-gradient(135deg, var(--u3-accent), var(--u3-cyan))",
            boxShadow: "0 0 20px rgba(139,92,246,0.35)",
            fontWeight: 600
          }}>🚀 Practice In Lounge</button>
        </div>
      </div>

      <div className="card lvl" style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))",
        border: "1px solid var(--u3-glass-border)",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        margin: "24px 0"
      }}>
        <div>
          <div className="lbl">Level {lvl}</div>
          <h2>{levelTitle(lvl)}</h2>
          <div className="bar" aria-label={`${into} of 100 XP to next level`}><i style={{ width: into + "%" }} /></div>
          <small className="hint">{quests.xp} XP · {100 - into} to level {lvl + 1} · {done}/{QUESTS.length} quests</small>
        </div>
        <div className="streak"><b>{quests.streak}</b><small>day streak 🔥</small></div>
      </div>

      {next && <div className="note"><b>Next up:</b> {next.title}. {next.hint}</div>}

      {groups.map((gr) => (
        <section key={gr}>
          <h3 className="sech">{gr}</h3>
          <div className="qgrid">
            {QUESTS.filter((q) => q.group === gr).map((q) => {
              const d = !!quests.done[q.id];
              return (
                <div key={q.id} className={"card q" + (d ? " done" : "")}>
                  <div className="qt"><span className="qc">{d ? "✓" : "○"}</span><b>{q.title}</b><span className="xp">+{q.xp}</span></div>
                  <small className="hint">{q.hint}</small>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <h3 className="sech">Controls</h3>
      <div className="card ctlcard">
        <p><b>PC:</b> W A S D or arrow keys to walk, drag with the mouse to look, click a player to open their card.</p>
        <p><b>Phone:</b> use the on-screen pad to walk, drag a finger on the scene to look, tap a player to open their card.</p>
        <p><b>Chat:</b> messages above your head are seen by everyone in the lounge. Use Community for rooms and People for private chats.</p>
      </div>
    </AppShell>
  );
}
