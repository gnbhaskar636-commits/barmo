/**
 * Browser speech helpers: live captions / dictation (speech to text) and read-aloud (text to speech).
 * Uses the browser's own Web Speech API. Chrome and Edge support recognition; where it is missing the app simply hides the buttons.
 * Note: in Chrome the audio is processed by Google's speech service, so the UI tells people before they turn it on.
 */
interface Rec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type RecCtor = new () => Rec;
const ctor = (): RecCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};
export const speechSupported = () => !!ctor();
export const speakSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export interface ListenOpts {
  lang?: string;
  /** Keep listening (captions) instead of stopping after one sentence (dictation). */
  keepAlive?: boolean;
  onText: (text: string, final: boolean) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

/** Starts listening. Returns a function that stops it. */
export function listen(o: ListenOpts): () => void {
  const C = ctor();
  if (!C) {
    o.onError?.("Speech recognition is not available in this browser. Try Chrome or Edge.");
    return () => {};
  }
  let stopped = false;
  let cur: Rec | null = null;
  const run = () => {
    const r = new C();
    cur = r;
    r.continuous = !!o.keepAlive;
    r.interimResults = true;
    r.lang = o.lang || (typeof navigator !== "undefined" ? navigator.language : "en-US");
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0]?.transcript?.trim();
        if (t) o.onText(t, res.isFinal);
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopped = true;
        o.onError?.("The microphone is blocked. Allow it in your browser to use this.");
      } else if (e.error === "audio-capture") {
        stopped = true;
        o.onError?.("No microphone was found.");
      }
    };
    r.onend = () => {
      if (!stopped && o.keepAlive) {
        window.setTimeout(() => {
          if (!stopped) {
            try {
              run();
            } catch {
              o.onEnd?.();
            }
          }
        }, 250);
      } else o.onEnd?.();
    };
    try {
      r.start();
    } catch {
      o.onError?.("Could not start the microphone.");
    }
  };
  run();
  return () => {
    stopped = true;
    try {
      cur?.stop();
    } catch {
      /* ignore */
    }
  };
}

/** Reads a message out loud (replaces anything still being read). */
export function speak(text: string) {
  if (!speakSupported()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 220));
    u.lang = navigator.language;
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
export function stopSpeaking() {
  if (speakSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}
