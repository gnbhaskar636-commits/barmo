"use client";

import { useEffect, useRef, useState } from "react";
import { createMeet, MEET_IDLE, type MeetCtl, type MeetState } from "@/lib/world/meetVideo";
import { LiveKitUnavailable } from "@/lib/world/livekitVoice";
import { getUid } from "@/lib/social/store";

/**
 * Google-Meet-style video call for the Meeting Hall.
 * It exists only while you are SEATED at the meeting table: stand up and you leave the call.
 */
export default function MeetPanel({ name, blocked, muted, onJoin }: { name: string; blocked: string[]; muted: string[]; onJoin?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctl = useRef<MeetCtl | null>(null);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const [st, setSt] = useState<MeetState>(MEET_IDLE);
  const [view, setView] = useState<"ask" | "setup" | "error" | "dismissed">("ask");
  const [msg, setMsg] = useState("");
  const [small, setSmall] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    const id = (getUid() || crypto.randomUUID()) + "~m" + Math.random().toString(36).slice(2, 8);
    const c = createMeet({
      myId: id,
      name,
      host: hostRef.current,
      isBlocked: (s) => blockedRef.current.includes(s),
      isMuted: (s) => mutedRef.current.includes(s),
      onChange: setSt,
    });
    ctl.current = c;
    return () => {
      c.leave(); // standing up (or leaving the world) ends the call
      ctl.current = null;
    };
  }, [name]);

  const join = async (cam: boolean) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMsg("Video needs a secure (https) page, a camera or microphone, and a current browser.");
      setView("error");
      return;
    }
    setView("ask");
    onJoin?.();
    try {
      await ctl.current?.join(cam);
    } catch (e) {
      if (e instanceof LiveKitUnavailable) setView("setup");
      else {
        setMsg(e instanceof Error ? e.message : "Could not start the meeting.");
        setView("error");
      }
    }
  };
  const leave = () => {
    ctl.current?.leave();
    setSmall(false);
  };
  const canShare = typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function";
  const live = st.joined;

  return (
    <>
      {!live && !st.connecting && view === "ask" && (
        <div className="meetask" role="dialog" aria-label="Video meeting">
          <div className="ma-t">🎥 <b>Video meeting</b> · you are seated at the table</div>
          <div className="ma-s">Talk face to face with everyone who joins. Standing up leaves the call.</div>
          <div className="ma-b">
            <button className="btn sm" onClick={() => void join(true)}>📷 Join with camera</button>
            <button className="btn g sm" onClick={() => void join(false)}>🎙️ Audio only</button>
            <button className="btn g sm" onClick={() => setView("dismissed")} aria-label="Not now">Not now</button>
          </div>
        </div>
      )}
      {!live && !st.connecting && view === "dismissed" && (
        <button className="btn g sm meetreopen" onClick={() => setView("ask")}>🎥 Video meeting</button>
      )}
      {st.connecting && <div className="meetask"><div className="ma-t">Connecting to the meeting…</div></div>}
      {!live && view === "setup" && (
        <div className="meetask" role="alert">
          <div className="ma-t">🎥 <b>Video calls are not switched on yet</b></div>
          <div className="ma-s">The site owner needs to add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET (free at cloud.livekit.io) in Vercel, then redeploy. See the README.</div>
          <div className="ma-b"><button className="btn g sm" onClick={() => setView("dismissed")}>Close</button></div>
        </div>
      )}
      {!live && view === "error" && (
        <div className="meetask" role="alert">
          <div className="ma-t">⚠️ {msg}</div>
          <div className="ma-b">
            <button className="btn sm" onClick={() => setView("ask")}>Try again</button>
            <button className="btn g sm" onClick={() => setView("dismissed")}>Close</button>
          </div>
        </div>
      )}

      <div className={"meet" + (live ? "" : " off") + (small ? " small" : "")}>
        <div className="mhead">
          <span>🎥 Meeting · {st.people} {st.people === 1 ? "person" : "people"}</span>
          <button className="mmin" onClick={() => setSmall(!small)} aria-label={small ? "Expand video" : "Shrink video"}>{small ? "⤢" : "–"}</button>
        </div>
        <div className="mgrid" ref={hostRef} />
        {live && (
          <div className="mbar">
            <button className={"mb" + (st.mic ? "" : " off")} aria-pressed={st.mic} aria-label={st.mic ? "Mute microphone" : "Unmute microphone"} onClick={() => void ctl.current?.setMic(!st.mic)}>{st.mic ? "🎙️" : "🔇"}</button>
            <button className={"mb" + (st.cam ? "" : " off")} aria-pressed={st.cam} aria-label={st.cam ? "Turn camera off" : "Turn camera on"} onClick={() => void ctl.current?.setCam(!st.cam)}>{st.cam ? "📷" : "🚫"}</button>
            {canShare && (
              <button className={"mb" + (st.share ? " on" : "")} aria-pressed={st.share} aria-label={st.share ? "Stop sharing screen" : "Share screen"} onClick={() => void ctl.current?.setShare(!st.share)}>🖥️</button>
            )}
            <button className="mb leave" aria-label="Leave meeting" onClick={leave}>📞</button>
          </div>
        )}
        {live && st.err && <div className="merr">{st.err}</div>}
      </div>
    </>
  );
}
