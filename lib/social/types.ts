import type { Pub } from "@/lib/social/store";
import type { GameId } from "@/lib/games/types";

export type FriendStatus = "none" | "pending_sent" | "pending_received" | "friend" | "blocked";

export interface Friendship {
  friendId: string;
  user: Pub;
  status: FriendStatus;
  since: number;
  lastInteraction?: number;
}

export interface DirectMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  ts: number;
  read?: boolean;
}

export interface Conversation {
  peerId: string;
  peer: Pub;
  lastMessage?: DirectMessage;
  unreadCount: number;
  updatedAt: number;
}

export type SquadRole = "leader" | "officer" | "member" | "recruit";

export interface SquadMember {
  id: string;
  name: string;
  av?: string;
  user?: Pub;
  role: SquadRole;
  joinedAt: number;
  isOnline?: boolean;
  activity?: PlayerActivity;
  voiceActive?: boolean;
}

export interface SquadVoiceRoomState {
  roomId: string;
  active: boolean;
  channelId?: string;
  activeSpeakers: string[];
  participants: Record<string, { id: string; name: string; isSpeaking: boolean; isMuted: boolean }>;
  startedAt?: number;
  fallbackMode?: boolean;
  fallbackReason?: string;
}

export interface Squad {
  id: string;
  name: string;
  tag: string; // e.g. "[APEX]"
  description: string;
  leaderId: string;
  members: SquadMember[];
  memberCount: number;
  capacity: number;
  maxMembers: number;
  isOpen: boolean;
  minLevel?: number;
  trophies: number;
  activeGame?: GameId;
  voiceRoom?: SquadVoiceRoomState;
  createdAt: number;
}

export type ActivityType = "in_game" | "in_tournament" | "in_lounge" | "in_squad_voice" | "idle";

export interface PlayerActivity {
  type: ActivityType;
  label: string;
  gameId?: GameId;
  roomCode?: string;
  tournamentId?: string;
  squadId?: string;
  startedAt: number;
}

export type PresenceStatus = "online" | "in_game" | "busy" | "away" | "offline";

export interface RichPresence {
  uid: string;
  userId?: string;
  name: string;
  av: string;
  headline?: string;
  user?: Pub;
  status: PresenceStatus;
  activity?: PlayerActivity;
  lastHeartbeat: number;
  voiceState?: { inVoice: boolean; muted: boolean; roomName?: string };
}

export interface FriendRequestResult {
  success: boolean;
  error?: string;
  status?: string;
  from?: string;
  to?: string;
  id?: string;
  ts?: number;
}

export interface FriendAcceptResult {
  success: boolean;
  status: "accepted" | "declined";
  friends: string[];
  pendingIn: string[];
  autoAccepted?: boolean;
}
