"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Pub } from "@/lib/social/store";
import { GAMES, QUESTIONS, type GameId, type GState } from "@/lib/games/types";
import { play } from "@/lib/sound";

const up = (s: unknown) => String(s).toUpperCase();
const MAX_PLAYERS = 8;

type Act = { t: "join"; pub: Pub } | { t: "roll" } | { t: "ans"; i: number } | { t: "tap" };

/**
 * Host-authoritative mini-game room over Supabase Broadcast + Presence.
 * The host (room creator) runs the rules and broadcasts the state; everyone else sends actions.
 * This is for fun between friends: there is no anti-cheat and nothing is stored.
 */
export function useGame(code: string, me: Pub, isHost: boolean, initial: GameId) {
  const [view, setView] = useState<GState | null>(null);
  const [connected, setConnected] = useState(false);
  const [hostGone, setHostGone] = useState(false);
  const [recvAt, setRecvAt] = useState(0);
  const chRef = useRef<RealtimeChannel | null>(null);
  const st = useRef<GState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const secret = useRef({ correct: -1, t0: 0, goAt: 0, used: [] as number[], times: {} as Record<string, number> });
  const sawHost = useRef(false);

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const push = useCallback(() => {
    const s = st.current;
    if (!s) return;
    const copy = JSON.parse(JSON.stringify(s)) as GState;
    setView(copy);
    setRecvAt(Date.now());
    void chRef.current?.send({ type: "broadcast", event: "st", payload: copy });
  }, []);

  // ----- host rules -----
  const finishRound = useCallback(() => {
    const s = st.current;
    if (!s || s.phase !== "play") return;
    clearTimers();
    const gained: Record<string, number> = {};
    const ids = Object.keys(s.players);
    if (s.game === "dice") {
      const rolls = s.rolls || {};
      ids.forEach((id) => { if (!rolls[id]) rolls[id] = 1 + Math.floor(Math.random() * 6); });
      s.rolls = rolls;
      const max = Math.max(...ids.map((id) => rolls[id]));
      ids.forEach((id) => { if (rolls[id] === max) gained[id] = 1; });
      s.msg = "Highest roll: " + max;
    } else if (s.game === "quiz") {
      const dur = s.q?.dur || 12000;
      s.correct = secret.current.correct;
      ids.forEach((id) => {
        if (s.answers?.[id] === secret.current.correct) {
          gained[id] = 10 + Math.round((1 - Math.min(1, (secret.current.times[id] || dur) / dur)) * 5);
        }
      });
      s.msg = "Correct answer: " + (s.q?.opts[secret.current.correct] ?? "");
    } else {
      const pts = [3, 2, 1];
      (s.taps || []).forEach((id, i) => { gained[id] = pts[i] ?? 0; });
      s.times = { ...secret.current.times };
      s.msg = s.taps && s.taps.length ? "Fastest: " + (s.players[s.taps[0]]?.name || "?") : "Nobody tapped in time";
    }
    Object.entries(gained).forEach(([id, g]) => { if (s.players[id]) s.players[id].score += g; });
    s.gained = gained;
    s.phase = "reveal";
    push();
    later(() => nextRound(), 3200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push]);

  const beginRound = useCallback(() => {
    const s = st.current;
    if (!s) return;
    clearTimers();
    s.round += 1;
    s.phase = "play";
    s.gained = undefined;
    s.msg = "";
    if (s.game === "dice") {
      s.rolls = {};
      s.msg = "Roll!";
      later(() => finishRound(), 15000);
    } else if (s.game === "quiz") {
      let idx = Math.floor(Math.random() * QUESTIONS.length);
      for (let i = 0; i < 20 && secret.current.used.includes(idx); i++) idx = Math.floor(Math.random() * QUESTIONS.length);
      secret.current.used.push(idx);
      const q = QUESTIONS[idx];
      // shuffle options, remember the correct index privately
      const order = q.o.map((_, i) => i).sort(() => Math.random() - 0.5);
      s.q = { text: q.q, opts: order.map((i) => q.o[i]), dur: 12000 };
      secret.current.correct = order.indexOf(q.a);
      secret.current.t0 = Date.now();
      secret.current.times = {};
      s.answers = {};
      s.correct = undefined;
      later(() => finishRound(), 12500);
    } else {
      s.rs = "wait";
      s.taps = [];
      s.early = [];
      s.times = undefined;
      secret.current.times = {};
      s.msg = "Wait for green…";
      later(() => {
        const c = st.current;
        if (!c || c.phase !== "play") return;
        c.rs = "go";
        c.msg = "GO!";
        secret.current.goAt = Date.now();
        push();
        later(() => finishRound(), 3000);
      }, 2000 + Math.random() * 3000);
    }
    push();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push, finishRound]);

  const nextRound = useCallback(() => {
    const s = st.current;
    if (!s) return;
    if (s.round >= s.rounds) {
      const max = Math.max(...Object.values(s.players).map((p) => p.score));
      s.winners = Object.values(s.players).filter((p) => p.score === max).map((p) => p.id);
      s.phase = "over";
      s.msg = "Game over";
      push();
    } else beginRound();
  }, [push, beginRound]);

  const handleAct = useCallback((from: string, a: Act) => {
    const s = st.current;
    if (!s) return;
    if (a.t === "join") {
      if (s.phase !== "lobby" && !s.players[from]) return;
      if (!s.players[from] && Object.keys(s.players).length >= MAX_PLAYERS) return;
      const p = a.pub;
      s.players[from] = { id: from, name: String(p.name || "Guest").slice(0, 20), av: p.av, acc: p.acc, top: p.top, score: s.players[from]?.score || 0 };
      push();
      return;
    }
    if (!s.players[from] || s.phase !== "play") return;
    const ids = Object.keys(s.players);
    if (a.t === "roll" && s.game === "dice") {
      s.rolls = s.rolls || {};
      if (s.rolls[from]) return;
      s.rolls[from] = 1 + Math.floor(Math.random() * 6);
      push();
      if (ids.every((id) => s.rolls![id])) finishRound();
    } else if (a.t === "ans" && s.game === "quiz") {
      s.answers = s.answers || {};
      if (s.answers[from] !== undefined || typeof a.i !== "number" || a.i < 0 || a.i > 3) return;
      s.answers[from] = a.i;
      secret.current.times[from] = Date.now() - secret.current.t0;
      push();
      if (ids.every((id) => s.answers![id] !== undefined)) finishRound();
    } else if (a.t === "tap" && s.game === "race") {
      s.taps = s.taps || [];
      s.early = s.early || [];
      if (s.taps.includes(from) || s.early.includes(from)) return;
      if (s.rs === "wait") s.early.push(from);
      else {
        s.taps.push(from);
        secret.current.times[from] = Date.now() - secret.current.goAt;
      }
      push();
      if (ids.every((id) => s.taps!.includes(id) || s.early!.includes(id))) finishRound();
    }
  }, [push, finishRound]);

  // ----- connection -----
  useEffect(() => {
    let db: SupabaseClient;
    try { db = supabaseBrowser(); } catch { return; }
    const info = GAMES.find((g) => g.id === initial) || GAMES[0];
    if (isHost) {
      st.current = {
        game: info.id, phase: "lobby", round: 0, rounds: info.rounds, host: me.id, msg: "Waiting for players",
        players: { [me.id]: { id: me.id, name: me.name, av: me.av, acc: me.acc, top: me.top, score: 0 } },
      };
      setView(JSON.parse(JSON.stringify(st.current)));
    }
    const ch = db.channel("game:" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: me.id } } });
    chRef.current = ch;
    ch.on("broadcast", { event: "st" }, ({ payload }) => {
      if (isHost) return;
      const s = payload as GState | null;
      if (!s || typeof s.phase !== "string" || !s.players) return;
      setView(s);
      setRecvAt(Date.now());
      setConnected(true);
    })
    .on("broadcast", { event: "act" }, ({ payload }) => {
      if (!isHost) return;
      const m = payload as { from?: string; a?: Act } | null;
      if (m && typeof m.from === "string" && m.a && typeof m.a.t === "string") handleAct(m.from, m.a);
    })
    .on("presence", { event: "sync" }, () => {
      const keys = Object.keys(ch.presenceState());
      if (isHost) {
        const s = st.current;
        if (s && s.phase === "lobby") {
          let changed = false;
          Object.keys(s.players).forEach((id) => { if (id !== me.id && !keys.includes(id)) { delete s.players[id]; changed = true; } });
          if (changed) push();
        }
      } else {
        const hostId = st.current?.host || "";
        void hostId;
      }
    })
    .subscribe(async (s) => {
      if (up(s) === "SUBSCRIBED") {
        await ch.track({ id: me.id });
        setConnected(true);
        if (!isHost) void ch.send({ type: "broadcast", event: "act", payload: { from: me.id, a: { t: "join", pub: me } } });
      }
    });

    const hb = setInterval(() => {
      if (isHost) push();
      else if (chRef.current) {
        const joined = st.current?.players?.[me.id];
        if (!joined) void chRef.current.send({ type: "broadcast", event: "act", payload: { from: me.id, a: { t: "join", pub: me } } });
      }
    }, 2500);

    return () => {
      clearInterval(hb);
      clearTimers();
      void db.removeChannel(ch);
      chRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, me.id, isHost]);

  // keep a mirror of the latest view for the non-host join heartbeat; detect a silent host
  useEffect(() => {
    if (!isHost) st.current = view;
  }, [view, isHost]);
  useEffect(() => {
    if (isHost || !view) return;
    sawHost.current = true;
    const t = setTimeout(() => setHostGone(true), 9000);
    setHostGone(false);
    return () => clearTimeout(t);
  }, [view, recvAt, isHost]);

  // sounds
  const lastPhase = useRef("");
  useEffect(() => {
    if (!view) return;
    const key = view.phase + view.round + (view.rs || "");
    if (key === lastPhase.current) return;
    lastPhase.current = key;
    if (view.phase === "play" && view.rs === "go") play("go");
    else if (view.phase === "play") play("roll");
    else if (view.phase === "reveal") play(view.gained?.[me.id] ? "pop" : "tick");
    else if (view.phase === "over") play(view.winners?.includes(me.id) ? "win" : "lose");
  }, [view, me.id]);

  const act = useCallback((a: Act) => {
    if (isHost) handleAct(me.id, a);
    else void chRef.current?.send({ type: "broadcast", event: "act", payload: { from: me.id, a } });
  }, [isHost, handleAct, me.id]);

  const setGame = useCallback((g: GameId) => {
    const s = st.current;
    const info = GAMES.find((x) => x.id === g);
    if (!isHost || !s || !info || s.phase !== "lobby") return;
    s.game = g;
    s.rounds = info.rounds;
    push();
  }, [isHost, push]);

  const start = useCallback(() => {
    const s = st.current;
    if (!isHost || !s || s.phase !== "lobby") return;
    secret.current.used = [];
    Object.values(s.players).forEach((p) => (p.score = 0));
    s.round = 0;
    beginRound();
  }, [isHost, beginRound]);

  const again = useCallback(() => {
    const s = st.current;
    if (!isHost || !s) return;
    clearTimers();
    s.phase = "lobby";
    s.round = 0;
    s.winners = undefined;
    s.gained = undefined;
    Object.values(s.players).forEach((p) => (p.score = 0));
    s.msg = "Waiting for players";
    push();
  }, [isHost, push]);

  return { view, connected, hostGone, recvAt, act, setGame, start, again };
}
