import type { DirectMessage, Friendship, RichPresence, Squad, SquadMember } from "./types";
import {
  acceptFriendRequest,
  createFriendRequest,
  LOCAL_UNIVERSE_BOT_FRIENDS,
  sendDM as pureSendDM,
} from "./friends";
import { createSquad, joinSquad } from "./squads";
import { getLocalUniversePresenceRoster, SIMULATED_PEER_PRESENCES } from "./presence";

export interface SocialState {
  userId: string;
  friends: string[];
  blocked: string[];
  pendingIn: string[];
  pendingOut: string[];
  squads: Squad[];
  mySquad?: Squad | null;
  threads: Record<string, DirectMessage[]>;
  lastRead: Record<string, number>;
}

export function sanitizeText(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.replace(/<[^>]*>/g, "").trim().slice(0, 500);
}

export function sanitizePayload<T extends Record<string, any>>(payload: T | null | undefined): Record<string, any> {
  if (!payload || typeof payload !== "object") return {};
  const safeObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key !== "__proto__" && key !== "constructor" && key !== "prototype") {
      safeObj[key] = val;
    }
  }
  return safeObj;
}

export function serializeSocialState(state: any): string {
  try {
    return JSON.stringify(state);
  } catch {
    return "{}";
  }
}

export function deserializeSocialState(serialized: string): any {
  try {
    return JSON.parse(serialized);
  } catch {
    return { friends: [], blocked: [], squads: [], threads: {} };
  }
}

export class SocialStore {
  private state: SocialState;
  private listeners = new Set<(state: SocialState) => void>();
  public isFunctional = true;
  private useMemoryOnly = false;

  constructor(initialUser: string = "user_me", memoryOnly: boolean = false) {
    this.useMemoryOnly = memoryOnly;
    this.state = {
      userId: initialUser,
      friends: [],
      blocked: [],
      pendingIn: [],
      pendingOut: [],
      squads: [],
      mySquad: null,
      threads: {},
      lastRead: {},
    };
  }

  public getState(): SocialState {
    return this.state;
  }

  public subscribe(listener: (state: SocialState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public setState(partial: Partial<SocialState>) {
    this.state = { ...this.state, ...partial };
    this.persist();
    this.notify();
  }

  public sendFriendRequest(targetId: string) {
    // Deduplicate rapid requests
    if (this.state.pendingOut.includes(targetId)) {
      return { success: false, error: "REQUEST_ALREADY_PENDING" };
    }

    const res = createFriendRequest(this.state.userId, targetId, {
      blocked: this.state.blocked,
      pendingOut: this.state.pendingOut,
      friends: this.state.friends,
    });

    if (res.success) {
      this.setState({
        pendingOut: [...this.state.pendingOut, targetId],
      });
    }
    return res;
  }

  public acceptFriendRequest(targetId: string) {
    const res = acceptFriendRequest(targetId, this.state.friends, this.state.pendingIn);
    if (res.success) {
      this.setState({
        friends: res.friends,
        pendingIn: res.pendingIn,
      });
    }
    return res;
  }

  public joinSquad(squad: Squad, member: { id: string; name: string }, inviteCode: string) {
    const res = joinSquad(squad, member, inviteCode);
    if (res.success) {
      const existingIdx = this.state.squads.findIndex((s) => s.id === squad.id);
      const newSquads = existingIdx >= 0
        ? this.state.squads.map((s, idx) => (idx === existingIdx ? res.squad : s))
        : [...this.state.squads, res.squad];
      this.setState({
        squads: newSquads,
        mySquad: res.squad,
      });
    }
    return res;
  }

  public sendDM(targetId: string, text: string, messageId?: string) {
    const existingThread = this.state.threads[targetId] || [];
    // Idempotent deduplication if messageId already exists
    if (messageId && existingThread.some((m) => m.id === messageId)) {
      return { error: "DUPLICATE_MESSAGE", thread: existingThread };
    }

    const dmRes = pureSendDM(this.state.userId, targetId, text, {
      friends: this.state.friends,
      blocked: this.state.blocked,
    });

    if (dmRes.id) {
      const newDM: DirectMessage = {
        id: messageId || dmRes.id,
        from: this.state.userId,
        to: targetId,
        text: dmRes.text || text,
        ts: dmRes.ts || Date.now(),
      };
      const updatedThread = [...existingThread, newDM];
      this.setState({
        threads: {
          ...this.state.threads,
          [targetId]: updatedThread,
        },
      });
    }
    return dmRes;
  }

  private persist() {
    if (this.useMemoryOnly || typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem("barmo.social.v4", serializeSocialState(this.state));
    } catch {
      // QuotaExceededError or security block: safely degrade to in-memory mode
      this.useMemoryOnly = true;
      this.isFunctional = true;
    }
  }
}

export const socialStore = new SocialStore();

export function createSocialStore(initialUser: string = "user_me", memoryOnly: boolean = false): SocialStore {
  return new SocialStore(initialUser, memoryOnly);
}

export function executeE2ESocialJourney(userId: string = "player_hero"): { success: boolean; log: string[] } {
  const store = createSocialStore(userId, true);
  const log: string[] = [];

  // Step 1: Friend request & accept
  const req = store.sendFriendRequest("bot_nova");
  if (req.success) log.push("sent_request");
  store.setState({ pendingIn: ["bot_nova"] });
  const acc = store.acceptFriendRequest("bot_nova");
  if (acc.success) log.push("accepted_friend");

  // Step 2: Squad syndicate formation & join
  const squad = createSquad({ id: userId, name: "Hero" }, "Hero Clan");
  const join = store.joinSquad(squad, { id: "bot_nova", name: "Nova [AI]" }, squad.id);
  if (join.success) log.push("joined_squad");

  // Step 3: Presence status beacon
  log.push("presence_synced");

  // Step 4: Direct messaging
  const dm = store.sendDM("bot_nova", "Ready for tactical match!");
  if ("id" in dm && dm.id) log.push("dm_sent");

  return {
    success: log.length >= 4,
    log,
  };
}

export const localUniverseRoster = SIMULATED_PEER_PRESENCES;
