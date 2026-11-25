"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Pub } from "@/lib/social/store";
import { GAMES, type Act, type GameId, type GState } from "@/lib/games/types";
import { getEngine } from "@/lib/games/engines";
import { play } from "@/lib/sound";

const up = (s: unknown) => String(s).toUpperCase();
const MAX_PLAYERS = 8;

export function pickBalancedTeam(players: Record<string, { team?: "neon" | "cyber" | "sol" }>): "neon" | "cyber" | "sol" {
  const counts: Record<"neon" | "cyber" | "sol", number> = { neon: 0, cyber: 0, sol: 0 };
  Object.values(players).forEach((p) => {
    if (p.team && (p.team === "neon" || p.team === "cyber" || p.team === "sol")) {
      counts[p.team]++;
    }
  });
  if (counts.neon <= counts.cyber && counts.neon <= counts.sol) return "neon";
  if (counts.cyber <= counts.sol) return "cyber";
  return "sol";
}

export function updateLobbyStats(s: GState) {
  const list = Object.values(s.players);
  s.spectatorCount = list.filter((p) => p.role === "spectator").length;
  s.readyCount = list.filter((p) => p.role !== "spectator" && p.ready).length;
}

/**
 * Host-authoritative mini-game room over Supabase Broadcast + Presence.
 * The host (room creator) runs the rules and broadcasts the state; everyone else sends actions.
 * Rules, scoring, and AI bot simulations are delegated to modular game engines.
 */
export function useGame(
  code: string,
  me: Pub,
  isHost: boolean,
  initial: GameId,
  initialRole: "player" | "spectator" = "player",
  tournamentContext?: { tournamentId: string; matchId: string; round: number }
) {
  const [view, setView] = useState<GState | null>(null);
  const [connected, setConnected] = useState(false);
  const [hostGone, setHostGone] = useState(false);
  const [recvAt, setRecvAt] = useState(0);
  const chRef = useRef<RealtimeChannel | null>(null);
  const st = useRef<GState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const secret = useRef({
    correct: -1,
    t0: 0,
    goAt: 0,
    used: [] as number[],
    times: {} as Record<string, number>,
    inputStart: 0,
    memorySeq: [] as number[],
    startTime: 0,
  });
  const sawHost = useRef(false);
  const handleActRef = useRef<(from: string, a: Act) => void>(() => {});

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const push = useCallback(() => {
    const s = st.current;
    if (!s) return;
    const copy = JSON.parse(JSON.stringify(s)) as GState;
    setView(copy);
    setRecvAt(Date.now());
    void chRef.current?.send({ type: "broadcast", event: "st", payload: copy });
  }, []);

  // ----- host rules delegated to modular engines -----
  const nextRound = useCallback(() => {
    const s = st.current;
    if (!s) return;
    if (s.round >= s.rounds) {
      const activePlayers = Object.values(s.players).filter((p) => p.role !== "spectator");
      const max = activePlayers.length ? Math.max(...activePlayers.map((p) => p.score)) : 0;
      s.winners = activePlayers.filter((p) => p.score === max).map((p) => p.id);
      s.phase = "over";
      s.msg = "Game over";
      push();
    } else {
      beginRound();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push]);

  const finishRound = useCallback(() => {
    const s = st.current;
    if (!s || s.phase !== "play") return;
    clearTimers();

    const engine = getEngine(s.game);
    const evaluation = engine.evaluateRound(s, secret.current);
    const gained = evaluation.scores || {};

    if (evaluation.msg) s.msg = evaluation.msg;

    Object.entries(gained).forEach(([id, g]) => {
      if (s.players[id] && s.players[id].role !== "spectator") s.players[id].score += g;
    });

    s.gained = gained;
    s.phase = "reveal";
    push();
    later(() => nextRound(), 3200);
  }, [clearTimers, later, nextRound, push]);

  const beginRound = useCallback(() => {
    const s = st.current;
    if (!s) return;
    clearTimers();
    s.round += 1;
    s.phase = "play";
    s.gained = undefined;
    s.msg = "";

    const engine = getEngine(s.game);
    const initPatch = engine.initRound(s.round, s.players, secret.current);
    Object.assign(s, initPatch);

    if (engine.onRoundStart) {
      engine.onRoundStart(s, secret.current, {
        later,
        finishRound,
        push,
        dispatchAct: (from, a) => handleActRef.current(from, a),
      });
    }

    push();
  }, [clearTimers, finishRound, later, push]);

  const handleAct = useCallback(
    (from: string, a: Act) => {
      const s = st.current;
      if (!s) return;

      if (a.t === "join") {
        const role = a.role || "player";
        const activePlayers = Object.values(s.players).filter((p) => p.role !== "spectator");
        if (s.phase !== "lobby" && !s.players[from]) return;
        if (!s.players[from] && role !== "spectator" && activePlayers.length >= MAX_PLAYERS) return;
        const p = a.pub;
        const existing = s.players[from];
        const assignedTeam = a.team || existing?.team || pickBalancedTeam(s.players);
        s.players[from] = {
          id: from,
          name: String(p.name || "Guest").slice(0, 20),
          av: p.av,
          acc: p.acc,
          top: p.top,
          score: existing?.score || 0,
          ready: existing?.ready !== undefined ? existing.ready : from === s.host,
          role,
          team: assignedTeam,
        };
        updateLobbyStats(s);
        push();
        return;
      }

      if (a.t === "ready") {
        if (s.phase !== "lobby") return;
        if (s.players[from]) {
          s.players[from].ready = a.ready !== undefined ? a.ready : !s.players[from].ready;
          updateLobbyStats(s);
          push();
        }
        return;
      }

      if (a.t === "team") {
        if (s.phase !== "lobby") return;
        if (s.players[from]) {
          s.players[from].team = a.team;
          push();
        }
        return;
      }

      if (a.t === "role") {
        if (s.phase !== "lobby") return;
        if (s.players[from]) {
          const activePlayers = Object.values(s.players).filter((p) => p.id !== from && p.role !== "spectator");
          if (a.role === "player" && activePlayers.length >= MAX_PLAYERS) {
            return;
          }
          s.players[from].role = a.role;
          if (a.role === "spectator") {
            s.players[from].ready = false;
          }
          updateLobbyStats(s);
          push();
        }
        return;
      }

      // Spectators cannot perform game actions
      if (!s.players[from] || s.players[from].role === "spectator" || s.phase !== "play") return;

      const engine = getEngine(s.game);
      const patch = engine.handleAct(a, from, s, secret.current);

      if (patch) {
        Object.assign(s, patch);
        push();

        if (engine.isRoundComplete && engine.isRoundComplete(s)) {
          finishRound();
        }
      }
    },
    [push, finishRound]
  );
  handleActRef.current = handleAct;

  // ----- connection -----
  useEffect(() => {
    let db: SupabaseClient;
    try {
      db = supabaseBrowser();
    } catch {
      return;
    }
    const info = GAMES.find((g) => g.id === initial) || GAMES[0];
    if (isHost) {
      st.current = {
        game: info.id,
        phase: "lobby",
        round: 0,
        rounds: info.rounds,
        host: me.id,
        msg: "Waiting for players",
        teamsEnabled: true,
        readyCount: initialRole === "spectator" ? 0 : 1,
        spectatorCount: initialRole === "spectator" ? 1 : 0,
        tournamentContext,
        players: {
          [me.id]: {
            id: me.id,
            name: me.name,
            av: me.av,
            acc: me.acc,
            top: me.top,
            score: 0,
            ready: true,
            role: initialRole,
            team: "neon",
          },
        },
      };
      setView(JSON.parse(JSON.stringify(st.current)));
    }
    const ch = db.channel("game:" + code, {
      config: { broadcast: { self: false, ack: false }, presence: { key: me.id } },
    });
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
        if (m && typeof m.from === "string" && m.a && typeof m.a.t === "string") {
          handleAct(m.from, m.a);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const keys = Object.keys(ch.presenceState());
        if (isHost) {
          const s = st.current;
          if (s && s.phase === "lobby") {
            let changed = false;
            Object.keys(s.players).forEach((id) => {
              if (id !== me.id && !keys.includes(id) && !id.startsWith("bot_")) {
                delete s.players[id];
                changed = true;
              }
            });
            if (changed) {
              updateLobbyStats(s);
              push();
            }
          }
        }
      })
      .subscribe(async (s) => {
        if (up(s) === "SUBSCRIBED") {
          await ch.track({ id: me.id });
          setConnected(true);
          if (!isHost) {
            void ch.send({
              type: "broadcast",
              event: "act",
              payload: { from: me.id, a: { t: "join", pub: me, role: initialRole } },
            });
          }
        }
      });

    const hb = setInterval(() => {
      if (isHost) push();
      else if (chRef.current) {
        const joined = st.current?.players?.[me.id];
        if (!joined) {
          void chRef.current.send({
            type: "broadcast",
            event: "act",
            payload: { from: me.id, a: { t: "join", pub: me, role: initialRole } },
          });
        }
      }
    }, 2500);

    return () => {
      clearInterval(hb);
      clearTimers();
      void db.removeChannel(ch);
      chRef.current = null;
    };
  }, [code, me, isHost, initial, initialRole, tournamentContext, clearTimers, handleAct, push]);

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

  // procedural sound triggers on game events
  const lastPhase = useRef("");
  useEffect(() => {
    if (!view) return;
    const key = view.phase + view.round + (view.rs || "") + (view.memoryPhase || "");
    if (key === lastPhase.current) return;
    lastPhase.current = key;
    if (view.phase === "play" && view.rs === "go") play("go");
    else if (view.phase === "play") play("roll");
    else if (view.phase === "reveal") play(view.gained?.[me.id] ? "pop" : "tick");
    else if (view.phase === "over") play(view.winners?.includes(me.id) ? "win" : "lose");
  }, [view, me.id]);

  const act = useCallback(
    (a: Act) => {
      if (isHost) handleAct(me.id, a);
      else void chRef.current?.send({ type: "broadcast", event: "act", payload: { from: me.id, a } });
    },
    [isHost, handleAct, me.id]
  );

  const setGame = useCallback(
    (g: GameId) => {
      const s = st.current;
      const info = GAMES.find((x) => x.id === g);
      if (!isHost || !s || !info || s.phase !== "lobby") return;
      s.game = g;
      s.rounds = info.rounds;
      push();
    },
    [isHost, push]
  );

  const start = useCallback(
    (forceOverride?: boolean | unknown) => {
      const isForced = typeof forceOverride === "boolean" ? forceOverride : false;
      const s = st.current;
      if (!isHost || !s || s.phase !== "lobby") return false;

      const activePlayers = Object.values(s.players).filter((p) => p.role !== "spectator");
      const activeNonBotPlayers = activePlayers.filter((p) => !p.id.startsWith("bot_"));

      // In multiplayer (more than 1 human player), check ready states unless host overrides
      if (activeNonBotPlayers.length > 1 && !isForced) {
        const unready = activeNonBotPlayers.filter((p) => !p.ready);
        if (unready.length > 0) {
          s.msg = `Ready check failed: ${unready.length} player${unready.length > 1 ? "s" : ""} unready.`;
          push();
          return false;
        }
      }

      secret.current.used = [];
      Object.values(s.players).forEach((p) => (p.score = 0));
      s.round = 0;
      beginRound();
      return true;
    },
    [isHost, beginRound, push]
  );

  const addBot = useCallback(() => {
    const s = st.current;
    if (!isHost || !s || s.phase !== "lobby") return;
    const botPresets = [
      { name: "Nova [AI]", av: "sage" },
      { name: "Viper [Bot]", av: "atlas" },
      { name: "Echo [Bot]", av: "slate" },
      { name: "Apex [Bot]", av: "clay" },
    ];
    const existing = Object.values(s.players).map((p) => p.name);
    const available = botPresets.filter((b) => !existing.includes(b.name));
    const pick = available[0] || { name: `Bot-${Math.floor(Math.random() * 900 + 100)}`, av: "atlas" };
    const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const botTeam = pickBalancedTeam(s.players);
    s.players[botId] = {
      id: botId,
      name: pick.name,
      av: pick.av,
      score: 0,
      ready: true,
      role: "player",
      team: botTeam,
    };
    updateLobbyStats(s);
    push();
    play("pop");
  }, [isHost, push]);

  const again = useCallback(() => {
    const s = st.current;
    if (!isHost || !s) return;
    clearTimers();
    s.phase = "lobby";
    s.round = 0;
    s.winners = undefined;
    s.gained = undefined;
    Object.values(s.players).forEach((p) => {
      p.score = 0;
      if (p.id !== s.host && !p.id.startsWith("bot_")) {
        p.ready = false;
      }
    });
    updateLobbyStats(s);
    s.msg = "Waiting for players";
    push();
  }, [clearTimers, isHost, push]);

  const toggleReady = useCallback(
    (ready?: boolean) => {
      act({ t: "ready", ready });
    },
    [act]
  );

  const setTeam = useCallback(
    (team: "neon" | "cyber" | "sol") => {
      act({ t: "team", team });
    },
    [act]
  );

  const setRole = useCallback(
    (role: "player" | "spectator") => {
      act({ t: "role", role });
    },
    [act]
  );

  return {
    view,
    connected,
    hostGone,
    recvAt,
    act,
    setGame,
    start,
    addBot,
    again,
    toggleReady,
    setTeam,
    setRole,
  };
}
