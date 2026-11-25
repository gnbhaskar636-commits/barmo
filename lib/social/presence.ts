import type { GameId } from "@/lib/games/types";
import type { PlayerActivity, PresenceStatus, RichPresence } from "./types";

const VALID_STATUSES: PresenceStatus[] = ["online", "in_game", "busy", "away", "offline"];

export function createPresence(
  uid: string,
  name: string,
  av: string,
  options?: { status?: PresenceStatus; activity?: PlayerActivity }
): RichPresence {
  const rawStatus = options?.status;
  const status: PresenceStatus = (rawStatus && VALID_STATUSES.includes(rawStatus))
    ? rawStatus
    : "online";

  return {
    uid,
    userId: uid,
    name: name || "Guest",
    av: av || "atlas",
    status,
    activity: status === "in_game" ? options?.activity : undefined,
    lastHeartbeat: Date.now(),
  };
}

export function updateStatus(
  presence: RichPresence,
  newStatus: PresenceStatus,
  activity?: PlayerActivity
): RichPresence {
  const status: PresenceStatus = VALID_STATUSES.includes(newStatus) ? newStatus : "online";
  let updatedActivity: PlayerActivity | undefined = activity;

  if (status === "offline") {
    updatedActivity = undefined;
  } else if (status === "in_game") {
    updatedActivity = activity || presence.activity;
  } else if (!activity) {
    updatedActivity = undefined;
  }

  return {
    ...presence,
    status,
    activity: updatedActivity,
    lastHeartbeat: Date.now(),
  };
}

export function recordHeartbeat(
  presence: RichPresence,
  timestamp: number = Date.now()
): RichPresence {
  return {
    ...presence,
    lastHeartbeat: timestamp,
  };
}

export function isPresenceStale(
  presence: RichPresence,
  now: number = Date.now(),
  timeoutMs: number = 30000
): boolean {
  return now - presence.lastHeartbeat > timeoutMs;
}

export function pruneStalePeers(
  roster: Map<string, RichPresence>,
  now: number = Date.now(),
  timeoutMs: number = 30000
): { roster: Map<string, RichPresence>; prunedCount: number } {
  let prunedCount = 0;
  for (const [id, peer] of roster.entries()) {
    if (isPresenceStale(peer, now, timeoutMs)) {
      roster.delete(id);
      prunedCount++;
    }
  }
  return {
    roster,
    prunedCount,
  };
}

export function syncPresenceRoster(
  roster: Map<string, RichPresence>,
  peers: (RichPresence | any)[]
): Map<string, RichPresence> {
  for (const peer of peers) {
    const id = peer.uid || peer.userId || peer.id;
    if (id) {
      roster.set(id, {
        uid: id,
        userId: id,
        name: peer.name || "Guest",
        av: peer.av || "atlas",
        headline: peer.headline,
        status: peer.status || "online",
        activity: peer.activity,
        lastHeartbeat: peer.lastHeartbeat || Date.now(),
        ...peer,
      });
    }
  }
  return roster;
}

export function filterPresenceForUser(
  roster: Map<string, RichPresence>,
  myId: string,
  blockedIds: string[] = []
): Map<string, RichPresence> {
  const filtered = new Map<string, RichPresence>();
  for (const [id, peer] of roster.entries()) {
    if (id !== myId && !blockedIds.includes(id)) {
      filtered.set(id, peer);
    }
  }
  return filtered;
}

export function getPresenceCounts(
  roster: Map<string, RichPresence> | Record<string, RichPresence>
): { total: number; inGame: number; away: number; online: number; offline: number } {
  const peers = roster instanceof Map ? Array.from(roster.values()) : Object.values(roster);
  let inGame = 0;
  let away = 0;
  let online = 0;
  let offline = 0;

  for (const p of peers) {
    if (p.status === "in_game") inGame++;
    else if (p.status === "away") away++;
    else if (p.status === "offline") offline++;
    else online++;
  }

  return {
    total: peers.length,
    inGame,
    away,
    online,
    offline,
  };
}

export interface FriendInGame extends RichPresence {
  roomCode?: string;
  gameId?: GameId;
}

export function findFriendsInGame(
  roster: Map<string, RichPresence>,
  friendIds: string[]
): FriendInGame[] {
  const matches: FriendInGame[] = [];
  for (const [id, peer] of roster.entries()) {
    if (friendIds.includes(id)) {
      if (peer.status === "in_game" || peer.activity?.gameId || peer.activity?.roomCode) {
        matches.push({
          ...peer,
          roomCode: peer.activity?.roomCode,
          gameId: peer.activity?.gameId,
        });
      }
    }
  }
  return matches;
}

export function cleanPresenceMeta(meta: any): { name: string; av: string; status: PresenceStatus } {
  if (!meta || typeof meta !== "object") {
    return { name: "Guest", av: "atlas", status: "online" };
  }

  const rawName = typeof meta.name === "string" ? meta.name : "Guest";
  // Strip HTML / script tags
  const sanitizedName = rawName.replace(/<[^>]*>/g, "").trim().slice(0, 30) || "Guest";
  const av = typeof meta.av === "string" ? meta.av.trim().slice(0, 20) : "atlas";
  const rawStatus = meta.status;
  const status: PresenceStatus = (typeof rawStatus === "string" && VALID_STATUSES.includes(rawStatus as any))
    ? (rawStatus as PresenceStatus)
    : "online";

  return {
    name: sanitizedName,
    av,
    status,
  };
}

export const SIMULATED_PEER_PRESENCES: RichPresence[] = [
  {
    uid: "bot_nova",
    userId: "bot_nova",
    name: "Nova [AI]",
    av: "nova",
    headline: "Resident AI Gaming Coach",
    status: "in_game",
    activity: {
      type: "in_game",
      label: "Analyzing match telemetry",
      gameId: "quiz",
      roomCode: "NOVA01",
      startedAt: Date.now() - 45000,
    },
    lastHeartbeat: Date.now(),
  },
  {
    uid: "bot_viper",
    userId: "bot_viper",
    name: "Viper [Bot]",
    av: "atlas",
    headline: "Grand Prix Champion",
    status: "in_game",
    activity: {
      type: "in_game",
      label: "Racing in Quantum Warp GP",
      gameId: "race",
      roomCode: "WARP42",
      startedAt: Date.now() - 20000,
    },
    lastHeartbeat: Date.now(),
  },
  {
    uid: "bot_echo",
    userId: "bot_echo",
    name: "Echo [Bot]",
    av: "sol",
    headline: "Cipher Master",
    status: "in_game",
    activity: {
      type: "in_game",
      label: "Decrypting Matrix Memory Lock",
      gameId: "memory",
      roomCode: "MEM99",
      startedAt: Date.now() - 15000,
    },
    lastHeartbeat: Date.now(),
  },
  {
    uid: "bot_apex",
    userId: "bot_apex",
    name: "Apex [Bot]",
    av: "vega",
    headline: "Tournament Contender",
    status: "in_game",
    activity: {
      type: "in_game",
      label: "Rolling Quantum Dice Duel",
      gameId: "dice",
      roomCode: "DICE07",
      startedAt: Date.now() - 10000,
    },
    lastHeartbeat: Date.now(),
  },
];

export function getLocalUniversePresenceRoster(): Map<string, RichPresence> {
  const map = new Map<string, RichPresence>();
  for (const bot of SIMULATED_PEER_PRESENCES) {
    map.set(bot.uid, { ...bot, lastHeartbeat: Date.now() });
  }
  return map;
}
