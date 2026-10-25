"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell, { enterLoungeUrl } from "@/components/app/AppShell";
import { Dot } from "@/components/app/Avatar";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import AvatarStudio, { type StudioValue } from "@/components/app/AvatarStudio";
import { hex } from "@/lib/world/avatar";
import { setSound, soundOn } from "@/lib/sound";
import AccountCard from "@/components/account/AccountCard";
import { ACHIEVEMENTS, loadAchievements } from "@/lib/world/achievements";
import { COMM_STYLES, OPEN_TO, STATUSES } from "@/lib/social/store";
import { levelOf, levelTitle } from "@/lib/social/quests";

function Mine() {
  const router = useRouter();
  const toast = useToast();
  const h = useHub();
  const me = h.me!;
  const [ach, setAch] = useState<string[]>([]);
  useEffect(() => setAch(loadAchievements()), []);
  const [name, setName] = useState(me.name);
  const [studio, setStudio] = useState<StudioValue>({ av: me.av, acc: me.acc || "none", top: me.top, look: me.look || {} });
  const av = studio.av;
  const top = studio.top;
  const [bio, setBio] = useState(me.bio);
  const [status, setStatus] = useState(me.status);
  const [tags, setTags] = useState(me.interests.join(", "));
  const [headline, setHeadline] = useState(me.headline || "");
  const [openTo, setOpenTo] = useState<string[]>(me.openTo || []);
  const [style, setStyle] = useState(me.style || "");
  const [langs, setLangs] = useState(me.langs || "");
  const [unique, setUnique] = useState(me.unique || "");
  const [askMe, setAskMe] = useState(me.askMe || "");
  const [snd, setSnd] = useState(true);
  useEffect(() => setSnd(soundOn()), []);
  const lvl = levelOf(h.quests.xp);
  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
  const checks = [name.trim().length > 0, headline.trim().length > 0, bio.trim().length > 0, tagList.length > 0, openTo.length > 0, style !== "", unique.trim().length > 0];
  const strength = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const toggleOpen = (o: string) => setOpenTo((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : cur.length >= 4 ? cur : [...cur, o]));

  const save = () => {
    const interests = tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
    h.saveProfile({ name: name.trim() || "Guest", av: studio.av, bio, status, interests, acc: studio.acc, top: studio.top, look: studio.look, headline: headline.trim(), openTo, style, langs: langs.trim(), unique: unique.trim(), askMe: askMe.trim() });
    toast("Profile saved");
  };
  const copyLink = async () => {
    const url = `${location.origin}/profile?id=${me.id}`;
    try { await navigator.clipboard.writeText(url); toast("Profile link copied"); } catch { toast(url); }
  };

  return (
    <>
      <div className="pagehead"><h1>My profile</h1><button className="btn" onClick={() => router.push(enterLoungeUrl(me.name, me.av))}>Enter the lounge</button></div>
      <div className="two prof2">
        <div className="card">
          <div className="phead"><Dot av={av} name={name} size={64} top={top} /><div><h2>{name || "Guest"}</h2><small className="hint">Level {lvl} · {levelTitle(lvl)} · {h.friends.length} friends</small></div></div>
          <label htmlFor="pn">Name</label>
          <input id="pn" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
          <span className="lbl">Avatar studio</span>
          <AvatarStudio value={studio} onChange={setStudio} />
          <label htmlFor="ps">Status</label>
          <select id="ps" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <label htmlFor="ph">Headline ({headline.length}/60)</label>
          <input id="ph" maxLength={60} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="What you do, e.g. Founder building AI tools" />
          <label htmlFor="pb">About you ({bio.length}/140)</label>
          <textarea id="pb" rows={3} maxLength={140} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What brings you to BARMO?" />
          <label htmlFor="pt">Interests (comma separated, up to 5)</label>
          <input id="pt" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, music, startups" />
          <div className="pf-sec">
            <h3>How you like to connect</h3>
            <p className="hint">This helps the right people start the right conversation with you.</p>
            <span className="lbl">I&apos;m here for (pick up to 4)</span>
            <div className="chips pick">
              {OPEN_TO.map((o) => <button type="button" key={o} className="chip" aria-pressed={openTo.includes(o)} onClick={() => toggleOpen(o)}>{o}</button>)}
            </div>
            <span className="lbl">My communication style</span>
            <div className="chips pick">
              {COMM_STYLES.map((o) => <button type="button" key={o} className="chip" aria-pressed={style === o} onClick={() => setStyle(style === o ? "" : o)}>{o}</button>)}
            </div>
            <label htmlFor="pl">Languages</label>
            <input id="pl" maxLength={40} value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="e.g. English, Telugu, Hindi" />
            <label htmlFor="pa">Ask me about</label>
            <input id="pa" maxLength={60} value={askMe} onChange={(e) => setAskMe(e.target.value)} placeholder="e.g. building MVPs, 3D on the web" />
          </div>
          <div className="pf-sec">
            <h3>What makes you unique</h3>
            <label htmlFor="pu">Something only you can say ({unique.length}/140)</label>
            <textarea id="pu" rows={2} maxLength={140} value={unique} onChange={(e) => setUnique(e.target.value)} placeholder="A superpower, a story, a strange skill, a fun fact…" />
          </div>
          <div className="row"><button className="btn" onClick={save}>Save profile</button><button className="btn g" onClick={copyLink}>Copy profile link</button></div>
        </div>
        <div className="card">
          <h3>Profile strength · {strength}%</h3>
          <div className="meter" aria-hidden="true"><i style={{ width: strength + "%" }} /></div>
          <p className="hint">{strength === 100 ? "Complete. People will know how to talk to you." : "Fill in the sections on the left to stand out."}</p>
          <h3>How others see you</h3>
          <div className="preview">
            <Dot av={av} name={name} size={48} on top={top} />
            <div><b>{name || "Guest"}</b><div className="hint">{headline || status}</div></div>
          </div>
          <p>{bio || <span className="hint">Your bio appears here.</span>}</p>
          {unique && <p>✨ {unique}</p>}
          {openTo.length > 0 && <div className="chips">{openTo.map((t) => <span key={t} className="chip on">{t}</span>)}</div>}
          {style && <div className="pv-line"><span>Style</span>{style}</div>}
          {langs && <div className="pv-line"><span>Languages</span>{langs}</div>}
          {askMe && <div className="pv-line"><span>Ask me about</span>{askMe}</div>}
          <div className="chips">{tagList.map((t) => <span key={t} className="chip">{t}</span>)}</div>
          <p className="hint">Your profile is shown to people who are online with you. Friends keep a copy so they can find you again.</p>
          <h3>Achievements · {ach.length} of {ACHIEVEMENTS.length}</h3>
          <div className="achgrid">
            {ACHIEVEMENTS.map((a) => (
              <div key={a.id} className={"ach" + (ach.includes(a.id) ? " on" : "")} title={a.desc}>
                <span className="ai">{ach.includes(a.id) ? a.icon : "🔒"}</span>
                <span><b>{a.title}</b><small>{a.desc}</small></span>
              </div>
            ))}
          </div>
          <h3>Account</h3>
          <AccountCard />
          <h3>Sound</h3>
          <button className="btn g sm" onClick={() => { const v = !snd; setSnd(v); setSound(v); }}>{snd ? "🔊 Sound effects on" : "🔇 Sound effects off"}</button>
          <h3>Blocked and muted</h3>
          {h.blocked.length === 0 && h.muted.length === 0 && <p className="hint">Nobody. Use Block or Mute on a player’s card or profile.</p>}
          {h.blocked.map((id) => <div key={id} className="blk"><span>Blocked · {id.slice(0, 8)}</span><button className="btn g sm" onClick={() => h.unblock(id)}>Unblock</button></div>)}
          {h.muted.map((id) => <div key={id} className="blk"><span>Muted · {id.slice(0, 8)}</span><button className="btn g sm" onClick={() => h.unmute(id)}>Unmute</button></div>)}
        </div>
      </div>
    </>
  );
}

function Theirs({ id }: { id: string }) {
  const router = useRouter();
  const h = useHub();
  const p = h.online[id] || h.friends.find((f) => f.id === id) || h.reqIn.find((r) => r.id === id) || null;
  const isFriend = h.friends.some((f) => f.id === id);
  const requested = h.reqOut.includes(id);
  const incoming = h.reqIn.some((r) => r.id === id);
  const toast = useToast();
  const [reason, setReason] = useState("Spam");
  const isBlocked = h.blocked.includes(id);
  const isMuted = h.muted.includes(id);
  if (isBlocked) {
    return (
      <>
        <div className="pagehead"><h1>Blocked</h1></div>
        <div className="card"><p>You blocked this player. They cannot message or request you, and you will not see them in the lounge.</p>
          <button className="btn" onClick={() => h.unblock(id)}>Unblock</button></div>
      </>
    );
  }
  if (!p) {
    return (
      <>
        <div className="pagehead"><h1>Profile</h1></div>
        <div className="empty">This person is not online right now, so their profile can’t be loaded yet. Try again when they are here.</div>
      </>
    );
  }
  return (
    <>
      <div className="pagehead"><h1>{p.name}</h1><button className="btn g" onClick={() => router.back()}>Back</button></div>
      <div className="card prof">
        <div className="phead"><Dot av={p.av} name={p.name} size={64} on={!!h.online[id]} top={p.top} /><div><h2>{p.name}</h2><small className="hint">{h.online[id] ? "Online" : "Offline"} · {p.status}</small></div></div>
        {p.headline && <p><b>{p.headline}</b></p>}
        <p>{p.bio || <span className="hint">No bio yet.</span>}</p>
        {p.unique && <p>✨ {p.unique}</p>}
        {(p.openTo?.length || 0) > 0 && <div className="chips">{p.openTo!.map((t) => <span key={t} className="chip on">{t}</span>)}</div>}
        {p.style && <div className="pv-line"><span>Style</span>{p.style}</div>}
        {p.langs && <div className="pv-line"><span>Languages</span>{p.langs}</div>}
        {p.askMe && <div className="pv-line"><span>Ask me about</span>{p.askMe}</div>}
        <div className="chips">{p.interests.map((t) => <span key={t} className="chip">{t}</span>)}</div>
        <div className="row">
          {isFriend ? (
            <button className="btn" onClick={() => router.push("/people?chat=" + id)}>Message</button>
          ) : incoming ? (
            <button className="btn" onClick={() => h.acceptRequest(p)}>Accept request</button>
          ) : requested ? (
            <button className="btn g" disabled>Request sent</button>
          ) : (
            <button className="btn" onClick={() => h.sendRequest(p)}>Add friend</button>
          )}
          {isFriend && h.groups.length > 0 && (
            <select aria-label="Invite to group" defaultValue="" onChange={(e) => { if (e.target.value) { h.inviteToGroup(e.target.value, id); e.target.value = ""; } }} style={{ width: "auto" }}>
              <option value="">Invite to group…</option>
              {h.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </div>
        <div className="safety">
          <button className="btn g sm" onClick={() => (isMuted ? h.unmute(id) : h.mute(id))}>{isMuted ? "Unmute" : "Mute"}</button>
          <button className="btn g sm" onClick={() => h.block(id)}>Block</button>
          <select aria-label="Report reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "auto" }}>
            {["Spam", "Harassment", "Inappropriate content", "Impersonation", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="btn g sm" onClick={async () => {
            const text = h.report(p, reason);
            try { await navigator.clipboard.writeText(text); toast("Report saved and copied. Send it to the site owner."); } catch { toast("Report saved on this device."); }
          }}>Report</button>
        </div>
        <p className="hint">Reports are saved on your device and copied so you can send them to the site owner. There is no automatic moderation yet; Block and Mute work immediately.</p>
      </div>
    </>
  );
}

function Body() {
  const sp = useSearchParams();
  const { me } = useHub();
  const id = sp.get("id");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !me) return null;
  return !id || id === me.id ? <Mine /> : <Theirs id={id} />;
}

export default function Page() {
  return (
    <AppShell>
      <Suspense><Body /></Suspense>
    </AppShell>
  );
}
