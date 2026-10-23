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
        <h1>Trainer</h1>
        <button className="btn" onClick={() => router.push(me ? enterLoungeUrl(me.name, me.av) : "/")}>Practice in the lounge</button>
      </div>

      <div className="card lvl">
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
