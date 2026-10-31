import type { Room, Track } from "livekit-client";
import { LiveKitUnavailable } from "@/lib/world/livekitVoice";

/**
 * Video meetings for the Meeting Hall (a small Google-Meet-style call through LiveKit).
 * The controller builds its own video tiles inside `host`, so React only has to show the buttons.
 * It is created when someone sits at the table and destroyed when they stand up.
 */
export interface MeetState {
  joined: boolean;
  connecting: boolean;
  mic: boolean;
  cam: boolean;
  share: boolean;
  people: number;
  err: string;
}
export const MEET_IDLE: MeetState = { joined: false, connecting: false, mic: false, cam: false, share: false, people: 0, err: "" };

export interface MeetOptions {
  myId: string;
  name: string;
  /** Where the video tiles go. */
  host: HTMLElement;
  isBlocked: (sid: string) => boolean;
  isMuted: (sid: string) => boolean;
  onChange: (s: MeetState) => void;
}

interface Tile {
  el: HTMLDivElement;
  video: HTMLVideoElement;
  av: HTMLDivElement;
  label: HTMLSpanElement;
  mic: HTMLSpanElement;
  track: Track | null;
}

export function createMeet(o: MeetOptions) {
  let room: Room | null = null;
  let lk: typeof import("livekit-client") | null = null;
  let connecting = false;
  let err = "";
  const tiles = new Map<string, Tile>();
  const audios = new Set<HTMLElement>();
  const sidOf = (id: string) => id.split("~")[0];

  const emit = () => {
    const lp = room?.localParticipant;
    o.onChange({
      joined: !!room && !connecting,
      connecting,
      mic: !!lp?.isMicrophoneEnabled,
      cam: !!lp?.isCameraEnabled,
      share: !!lp?.isScreenShareEnabled,
      people: room ? room.remoteParticipants.size + 1 : 0,
      err,
    });
  };

  const makeTile = (key: string): Tile => {
    const el = document.createElement("div");
    el.className = "mt";
    el.dataset.key = key;
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true; // video tracks carry no sound; audio plays through its own hidden element
    video.setAttribute("playsinline", "");
    const av = document.createElement("div");
    av.className = "mt-av";
    const bar = document.createElement("div");
    bar.className = "mt-name";
    const mic = document.createElement("span");
    mic.className = "mt-mic";
    const label = document.createElement("span");
    bar.append(mic, label);
    el.append(video, av, bar);
    el.onclick = () => el.classList.toggle("pin"); // click a tile to make it big
    o.host.appendChild(el);
    return { el, video, av, label, mic, track: null };
  };

  /** Brings the tiles in line with who is in the call and what they are sending. */
  const sync = () => {
    if (!room || !lk) return;
    const L = lk;
    const want = new Set<string>();
    const lp = room.localParticipant;
    const show = (key: string, name: string, local: boolean, track: Track | undefined, micOn: boolean, speaking: boolean, screen: boolean) => {
      want.add(key);
      let t = tiles.get(key);
      if (!t) {
        t = makeTile(key);
        tiles.set(key, t);
      }
      if (t.track !== (track || null)) {
        if (t.track) t.track.detach(t.video);
        t.track = track || null;
        if (track) track.attach(t.video);
      }
      const hasVideo = !!track;
      t.el.classList.toggle("novid", !hasVideo);
      t.el.classList.toggle("local", local && !screen);
      t.el.classList.toggle("screen", screen);
      t.el.classList.toggle("speaking", speaking && !screen);
      t.av.textContent = (name[0] || "?").toUpperCase();
      t.label.textContent = local && !screen ? name + " (you)" : name;
      t.mic.textContent = screen ? "🖥️" : micOn ? "" : "🔇";
    };
    const parts = [lp, ...room.remoteParticipants.values()];
    for (const p of parts) {
      const local = p === lp;
      if (!local && o.isBlocked(sidOf(p.identity))) continue;
      const name = (p.name || "Guest").slice(0, 20);
      const cam = p.getTrackPublication(L.Track.Source.Camera);
      const mic = p.getTrackPublication(L.Track.Source.Microphone);
      show(p.identity, name, local, cam && !cam.isMuted ? cam.track : undefined, !!mic && !mic.isMuted, p.isSpeaking, false);
      const sh = p.getTrackPublication(L.Track.Source.ScreenShare);
      if (sh && !sh.isMuted && sh.track) show(p.identity + ":screen", name + " · screen", false, sh.track, true, false, true);
    }
    tiles.forEach((t, key) => {
      if (want.has(key)) return;
      if (t.track) t.track.detach(t.video);
      t.el.remove();
      tiles.delete(key);
    });
    o.host.classList.toggle("has-screen", [...tiles.values()].some((t) => t.el.classList.contains("screen")));
    o.host.dataset.count = String(tiles.size);
    emit();
  };

  const cleanup = () => {
    tiles.forEach((t) => {
      if (t.track) t.track.detach(t.video);
      t.el.remove();
    });
    tiles.clear();
    audios.forEach((a) => a.remove());
    audios.clear();
    room = null;
    connecting = false;
    emit();
  };

  return {
    active: () => !!room,
    /** Join the meeting table. Throws LiveKitUnavailable when the server has no LiveKit keys. */
    async join(withCamera: boolean) {
      if (room || connecting) return;
      connecting = true;
      err = "";
      emit();
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: "meeting", meet: true, id: o.myId, name: o.name }),
        });
        if (res.status === 501) throw new LiveKitUnavailable("LiveKit is not configured");
        const j = (await res.json().catch(() => ({}))) as { token?: string; url?: string; error?: string };
        if (!res.ok || !j.token || !j.url) throw new Error(j.error || "Could not start the meeting");

        lk = await import("livekit-client");
        const L = lk;
        const r = new L.Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        r.on(L.RoomEvent.TrackSubscribed, (track, _pub, p) => {
          if (track.kind === L.Track.Kind.Audio) {
            const sid = sidOf(p.identity);
            if (o.isBlocked(sid)) return;
            const el = track.attach();
            el.style.display = "none";
            el.muted = o.isMuted(sid);
            document.body.appendChild(el);
            audios.add(el);
          }
          sync();
        });
        r.on(L.RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === L.Track.Kind.Audio)
            track.detach().forEach((el) => {
              audios.delete(el);
              el.remove();
            });
          sync();
        });
        r.on(L.RoomEvent.ParticipantConnected, () => sync());
        r.on(L.RoomEvent.ParticipantDisconnected, () => sync());
        r.on(L.RoomEvent.TrackMuted, () => sync());
        r.on(L.RoomEvent.TrackUnmuted, () => sync());
        r.on(L.RoomEvent.LocalTrackPublished, () => sync());
        r.on(L.RoomEvent.LocalTrackUnpublished, () => sync());
        r.on(L.RoomEvent.ActiveSpeakersChanged, () => sync());
        r.on(L.RoomEvent.Disconnected, cleanup);
        room = r;
        await r.connect(j.url, j.token);
        connecting = false;
        // Each device is asked for separately: a blocked camera should not stop you from joining with sound.
        try {
          await r.localParticipant.setMicrophoneEnabled(true);
        } catch {
          err = "Microphone is blocked. Allow it in your browser to be heard.";
        }
        if (withCamera) {
          try {
            await r.localParticipant.setCameraEnabled(true);
          } catch {
            err = "Camera is blocked or missing. You can still talk and listen.";
          }
        }
        void r.startAudio().catch(() => {});
        sync();
      } catch (e) {
        const r = room as Room | null;
        room = null;
        connecting = false;
        if (r) {
          try {
            await r.disconnect();
          } catch {
            /* ignore */
          }
        }
        cleanup();
        throw e;
      }
    },
    leave() {
      const r = room;
      if (!r) return;
      void r.disconnect();
      cleanup();
    },
    async setMic(on: boolean) {
      try {
        await room?.localParticipant.setMicrophoneEnabled(on);
        err = "";
      } catch {
        err = "Microphone is blocked. Allow it in your browser.";
      }
      sync();
    },
    async setCam(on: boolean) {
      try {
        await room?.localParticipant.setCameraEnabled(on);
        err = "";
      } catch {
        err = "Camera is blocked or missing. Allow it in your browser.";
      }
      sync();
    },
    async setShare(on: boolean) {
      try {
        await room?.localParticipant.setScreenShareEnabled(on);
        err = "";
      } catch {
        err = on ? "Screen sharing was cancelled or is not supported on this device." : "";
      }
      sync();
    },
  };
}
export type MeetCtl = ReturnType<typeof createMeet>;
