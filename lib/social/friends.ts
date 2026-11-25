import type { DirectMessage, FriendRequestResult, FriendAcceptResult } from "./types";
import type { Pub } from "./store";

export interface FriendContext {
  blocked?: string[];
  pendingOut?: string[];
  pendingIn?: string[];
  friends?: string[];
}

export function createFriendRequest(
  fromId: string,
  toId: string,
  context?: FriendContext
): FriendRequestResult {
  if (fromId === toId) {
    return { success: false, error: "CANNOT_REQUEST_SELF" };
  }
  if (context?.blocked?.includes(toId)) {
    return { success: false, error: "USER_BLOCKED" };
  }
  if (context?.pendingOut?.includes(toId)) {
    return { success: false, error: "REQUEST_ALREADY_PENDING" };
  }
  if (context?.friends?.includes(toId)) {
    return { success: false, error: "ALREADY_FRIENDS" };
  }

  return {
    success: true,
    status: "pending",
    from: fromId,
    to: toId,
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
  };
}

export function acceptFriendRequest(
  targetId: string,
  currentFriends: string[],
  pendingIn: string[]
): FriendAcceptResult {
  const friends = currentFriends.includes(targetId) ? currentFriends : [...currentFriends, targetId];
  const remainingPending = pendingIn.filter((id) => id !== targetId);
  return {
    success: true,
    status: "accepted",
    friends,
    pendingIn: remainingPending,
  };
}

export function declineFriendRequest(
  targetId: string,
  currentFriends: string[],
  pendingIn: string[]
): FriendAcceptResult {
  return {
    success: true,
    status: "declined",
    friends: [...currentFriends],
    pendingIn: pendingIn.filter((id) => id !== targetId),
  };
}

export function handleReciprocalRequest(
  fromId: string,
  toId: string,
  pendingIn: string[],
  currentFriends: string[] = []
): { autoAccepted: boolean; friends: string[]; pendingIn: string[] } {
  // If the target had already sent us an incoming request, auto-accept immediately
  if (pendingIn.includes(toId)) {
    const friends = currentFriends.includes(toId) ? currentFriends : [...currentFriends, toId];
    return {
      autoAccepted: true,
      friends,
      pendingIn: pendingIn.filter((id) => id !== toId),
    };
  }
  return {
    autoAccepted: false,
    friends: currentFriends,
    pendingIn,
  };
}

export function blockUser<T extends { from: string; to: string }>(
  myId: string,
  targetId: string,
  state: {
    friends: string[];
    blocked: string[];
    requests?: T[];
    threads?: Record<string, DirectMessage[]>;
  }
): {
  friends: string[];
  blocked: string[];
  requests: T[];
  threads: Record<string, DirectMessage[]>;
} {
  const blocked = state.blocked.includes(targetId) ? [...state.blocked] : [...state.blocked, targetId];
  const friends = state.friends.filter((id) => id !== targetId);
  const requests = (state.requests || []).filter((r) => r.from !== targetId && r.to !== targetId);
  const threads = { ...(state.threads || {}) };
  delete threads[targetId];

  return {
    friends,
    blocked,
    requests,
    threads,
  };
}

export function unblockUser(
  myId: string,
  targetId: string,
  state: { blocked: string[]; friends: string[] }
): { blocked: string[]; friends: string[] } {
  return {
    blocked: state.blocked.filter((id) => id !== targetId),
    friends: [...state.friends], // unblocking does NOT restore deleted friendships
  };
}

export function sendDM(
  fromId: string,
  toId: string,
  text: string,
  context?: { friends?: string[]; blocked?: string[] }
): { error?: string; id?: string; from?: string; to?: string; text?: string; ts?: number } {
  if (context?.friends && !context.friends.includes(toId)) {
    return { error: "FRIENDS_ONLY" };
  }
  if (context?.blocked?.includes(toId)) {
    return { error: "USER_BLOCKED" };
  }
  if (!text || !text.trim()) {
    return { error: "EMPTY_MESSAGE" };
  }

  const sanitized = text.trim().slice(0, 500);
  return {
    id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    from: fromId,
    to: toId,
    text: sanitized,
    ts: Date.now(),
  };
}

export function orderDirectMessages(messages: DirectMessage[]): DirectMessage[] {
  return [...messages].sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;
    return a.id.localeCompare(b.id);
  });
}

export function calculateThreadUnread(
  messages: DirectMessage[],
  lastRead: number,
  currentUserId: string
): number {
  return messages.filter((m) => m.ts > lastRead && m.from !== currentUserId).length;
}

export function calculateTotalUnreadDMs(
  threads: Record<string, DirectMessage[]>,
  lastReads: Record<string, number>,
  currentUserId: string
): number {
  let count = 0;
  for (const [peerId, msgs] of Object.entries(threads)) {
    const last = lastReads[peerId] || 0;
    count += calculateThreadUnread(msgs, last, currentUserId);
  }
  return count;
}

export function markThreadAsRead<T extends { unreadCount: number; lastRead?: number }>(
  thread: T,
  readTime: number = Date.now()
): T {
  return {
    ...thread,
    unreadCount: 0,
    lastRead: readTime,
  };
}

export const LOCAL_UNIVERSE_BOT_FRIENDS: Pub[] = [
  {
    id: "bot_nova",
    name: "Nova [AI]",
    av: "nova",
    status: "Analyzing game telemetry",
    bio: "Barmo tactical strategist & AI companion.",
    interests: ["gaming", "strategy", "analytics"],
    headline: "Resident AI Gaming Coach",
  },
  {
    id: "bot_viper",
    name: "Viper [Bot]",
    av: "atlas",
    status: "Racing in Quantum Warp GP",
    bio: "Sub-160ms reaction reflex specialist.",
    interests: ["racing", "speedrun", "cyberpunk"],
    headline: "Grand Prix Champion",
  },
  {
    id: "bot_echo",
    name: "Echo [Bot]",
    av: "sol",
    status: "Deciphering Matrix Memory Lock",
    bio: "Neural pattern and algorithmic cipher solver.",
    interests: ["logic", "memory", "puzzles"],
    headline: "Cipher Master",
  },
  {
    id: "bot_apex",
    name: "Apex [Bot]",
    av: "vega",
    status: "Rolling Quantum Dice Duel",
    bio: "Competitive bracket leader and high-roller.",
    interests: ["esports", "dice", "tournaments"],
    headline: "Tournament Contender",
  },
];
