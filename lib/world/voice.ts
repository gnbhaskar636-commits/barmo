/**
 * Voice for private circles. Small mesh of direct browser-to-browser audio links (WebRTC).
 * The realtime channel is only used to introduce people to each other (signalling); audio never
 * goes through the server. Only people standing in the same circle can join, up to 4 voices.
 * Public STUN servers are used, so a few strict networks (some offices/mobile carriers) may not connect.
 */
export type VoiceKind = "join" | "ready" | "offer" | "answer" | "ice" | "leave";
export interface VoiceSignal {
  kind: VoiceKind;
  /** The circle this belongs to. */
  h: string;
  /** Who it is meant for (omitted = everyone in the circle). */
  to?: string;
  d?: unknown;
}
export const VOICE_KINDS: VoiceKind[] = ["join", "ready", "offer", "answer", "ice", "leave"];
export const MAX_VOICES = 4;

export interface VoiceState { active: boolean; muted: boolean; peers: number }

/** What the world UI needs from any voice engine. */
export interface VoiceCtl {
  active: () => boolean;
  circle: () => string | null;
  start: (h: string) => Promise<void>;
  stop: () => void;
  setMuted: (m: boolean) => void;
  handle: (from: string, s: VoiceSignal) => Promise<void>;
  drop: (id: string) => void;
}

export interface VoiceOptions {
  myId: string;
  send: (s: VoiceSignal) => void;
  onChange: (s: VoiceState) => void;
  /** id null = me */
  onSpeaking: (id: string | null, on: boolean) => void;
  isBlocked: (id: string) => boolean;
  isMuted: (id: string) => boolean;
}

interface Link {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  pending: RTCIceCandidateInit[];
  stopMeter?: () => void;
}

const ICE: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

export function createVoice(o: VoiceOptions) {
  let stream: MediaStream | null = null;
  let circle: string | null = null;
  let muted = false;
  let ctx: AudioContext | null = null;
  let stopMine: (() => void) | undefined;
  const links = new Map<string, Link>();

  const emit = () => o.onChange({ active: !!stream, muted, peers: links.size });

  /** Calls onSpeaking when the loudness of a stream crosses a threshold. */
  const meter = (s: MediaStream, id: string | null) => {
    if (!ctx) return undefined;
    try {
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let on = false;
      const iv = window.setInterval(() => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const x = (buf[i] - 128) / 128;
          sum += x * x;
        }
        const talking = Math.sqrt(sum / buf.length) > 0.04 && (id !== null || !muted);
        if (talking !== on) {
          on = talking;
          o.onSpeaking(id, on);
        }
      }, 150);
      return () => {
        window.clearInterval(iv);
        if (on) o.onSpeaking(id, false);
      };
    } catch {
      return undefined;
    }
  };

  const closeLink = (id: string) => {
    const l = links.get(id);
    if (!l) return;
    links.delete(id);
    l.stopMeter?.();
    l.audio.srcObject = null;
    l.audio.remove();
    try {
      l.pc.close();
    } catch {
      /* already closed */
    }
    emit();
  };

  const makeLink = (id: string): Link | null => {
    if (!stream || !circle) return null;
    const h = circle;
    const pc = new RTCPeerConnection(ICE);
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "");
    audio.muted = o.isMuted(id);
    audio.style.display = "none";
    document.body.appendChild(audio);
    const link: Link = { pc, audio, pending: [] };
    stream.getTracks().forEach((t) => pc.addTrack(t, stream!));
    pc.onicecandidate = (e) => {
      if (e.candidate) o.send({ kind: "ice", h, to: id, d: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const rs = e.streams[0];
      if (!rs) return;
      audio.srcObject = rs;
      void audio.play().catch(() => {});
      link.stopMeter?.();
      link.stopMeter = meter(rs, id);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") closeLink(id);
    };
    links.set(id, link);
    emit();
    return link;
  };

  const offerTo = async (id: string) => {
    if (links.has(id) || links.size >= MAX_VOICES - 1) return;
    const l = makeLink(id);
    if (!l || !circle) return;
    try {
      const offer = await l.pc.createOffer();
      await l.pc.setLocalDescription(offer);
      o.send({ kind: "offer", h: circle, to: id, d: offer });
    } catch {
      closeLink(id);
    }
  };

  return {
    active: () => !!stream,
    circle: () => circle,
    async start(h: string) {
      if (stream) return;
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      stream = s;
      circle = h;
      muted = false;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
        void ctx.resume();
      } catch {
        ctx = null;
      }
      stopMine = meter(s, null);
      emit();
      o.send({ kind: "join", h });
    },
    stop() {
      if (!stream && links.size === 0) return;
      if (circle) o.send({ kind: "leave", h: circle });
      [...links.keys()].forEach(closeLink);
      stopMine?.();
      stopMine = undefined;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      circle = null;
      try {
        void ctx?.close();
      } catch {
        /* ignore */
      }
      ctx = null;
      muted = false;
      emit();
    },
    setMuted(m: boolean) {
      muted = m;
      stream?.getAudioTracks().forEach((t) => (t.enabled = !m));
      emit();
    },
    /** A signal from someone else in the room. */
    async handle(from: string, s: VoiceSignal) {
      if (!stream || !circle || s.h !== circle || from === o.myId) return;
      if (o.isBlocked(from)) return;
      if (s.to && s.to !== o.myId) return;
      try {
        if (s.kind === "join") {
          // The smaller id always starts the call, so two people never start at once.
          if (o.myId < from) await offerTo(from);
          else o.send({ kind: "ready", h: circle, to: from });
        } else if (s.kind === "ready") {
          if (o.myId < from) await offerTo(from);
        } else if (s.kind === "offer") {
          if (links.size >= MAX_VOICES - 1 && !links.has(from)) return;
          closeLink(from);
          const l = makeLink(from);
          if (!l) return;
          await l.pc.setRemoteDescription(s.d as RTCSessionDescriptionInit);
          const ans = await l.pc.createAnswer();
          await l.pc.setLocalDescription(ans);
          o.send({ kind: "answer", h: circle, to: from, d: ans });
          for (const c of l.pending.splice(0)) await l.pc.addIceCandidate(c).catch(() => {});
        } else if (s.kind === "answer") {
          const l = links.get(from);
          if (!l) return;
          await l.pc.setRemoteDescription(s.d as RTCSessionDescriptionInit);
          for (const c of l.pending.splice(0)) await l.pc.addIceCandidate(c).catch(() => {});
        } else if (s.kind === "ice") {
          const l = links.get(from);
          if (!l || !s.d) return;
          if (l.pc.remoteDescription) await l.pc.addIceCandidate(s.d as RTCIceCandidateInit).catch(() => {});
          else l.pending.push(s.d as RTCIceCandidateInit);
        } else if (s.kind === "leave") {
          closeLink(from);
        }
      } catch {
        closeLink(from);
      }
    },
    /** Someone left the room: drop their link. */
    drop(id: string) {
      closeLink(id);
    },
  };
}
