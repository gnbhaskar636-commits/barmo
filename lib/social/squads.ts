import type { Squad, SquadMember, SquadRole, SquadVoiceRoomState } from "./types";

export function generateSquadId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SQ-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createSquad(
  leader: { id: string; name?: string; av?: string },
  rawName?: string,
  rawTag?: string,
  emblem?: string
): Squad {
  const cleanName = (rawName || "").trim().slice(0, 30) || "My Squad";
  const cleanTag = (rawTag || "[SQ]").trim().slice(0, 6) || "[SQ]";
  const id = generateSquadId();

  const leaderMember: SquadMember = {
    id: leader.id,
    name: leader.name || "Leader",
    av: leader.av || "atlas",
    role: "leader",
    joinedAt: Date.now(),
    isOnline: true,
  };

  return {
    id,
    name: cleanName,
    tag: cleanTag,
    description: "Tactical gaming syndicate.",
    leaderId: leader.id,
    members: [leaderMember],
    memberCount: 1,
    capacity: 8,
    maxMembers: 8,
    isOpen: true,
    trophies: 0,
    createdAt: Date.now(),
  };
}

export function isSquadFull(squad: Squad): boolean {
  const max = squad.capacity || squad.maxMembers || 8;
  return squad.members.length >= max;
}

export function joinSquad(
  squad: Squad,
  member: { id: string; name?: string; av?: string },
  inviteCode: string
): { success: boolean; error?: string; squad: Squad; members: SquadMember[] } {
  if (inviteCode.trim().toUpperCase() !== squad.id.toUpperCase()) {
    return { success: false, error: "INVALID_CODE", squad, members: squad.members };
  }

  // Idempotent: check if already a member
  if (squad.members.some((m) => m.id === member.id)) {
    return { success: true, squad, members: squad.members };
  }

  if (isSquadFull(squad)) {
    return { success: false, error: "SQUAD_CAPACITY_REACHED", squad, members: squad.members };
  }

  const newMember: SquadMember = {
    id: member.id,
    name: member.name || "Operative",
    av: member.av || "atlas",
    role: "member",
    joinedAt: Date.now(),
    isOnline: true,
  };

  const updatedMembers = [...squad.members, newMember];
  const updatedSquad: Squad = {
    ...squad,
    members: updatedMembers,
    memberCount: updatedMembers.length,
  };

  return {
    success: true,
    squad: updatedSquad,
    members: updatedMembers,
  };
}

export function promoteMember(
  squad: Squad,
  actorId: string,
  targetId: string,
  newRole: SquadRole
): { role?: SquadRole; error?: string; squad?: Squad } {
  const actor = squad.members.find((m) => m.id === actorId);
  if (!actor || actor.role !== "leader") {
    return { error: "PERMISSION_DENIED" };
  }

  const target = squad.members.find((m) => m.id === targetId);
  if (!target) {
    return { error: "MEMBER_NOT_FOUND" };
  }

  const updatedMembers = squad.members.map((m) =>
    m.id === targetId ? { ...m, role: newRole } : m
  );

  return {
    role: newRole,
    squad: {
      ...squad,
      members: updatedMembers,
    },
  };
}

export function transferLeadership(
  squad: Squad,
  currentLeaderId: string,
  targetMemberId: string
): { success?: boolean; leaderId?: string; error?: string; squad?: Squad } {
  if (squad.leaderId !== currentLeaderId) {
    return { error: "PERMISSION_DENIED" };
  }

  const target = squad.members.find((m) => m.id === targetMemberId);
  if (!target) {
    return { error: "MEMBER_NOT_FOUND" };
  }

  const updatedMembers = squad.members.map((m) => {
    if (m.id === targetMemberId) return { ...m, role: "leader" as SquadRole };
    if (m.id === currentLeaderId) return { ...m, role: "officer" as SquadRole };
    return m;
  });

  const updatedSquad: Squad = {
    ...squad,
    leaderId: targetMemberId,
    members: updatedMembers,
  };

  return {
    success: true,
    leaderId: targetMemberId,
    squad: updatedSquad,
  };
}

export function kickMember(
  squad: Squad,
  actorId: string,
  targetId: string
): { success?: boolean; error?: string; squad?: Squad } {
  const actor = squad.members.find((m) => m.id === actorId);
  const target = squad.members.find((m) => m.id === targetId);

  if (!actor || !target) {
    return { error: "MEMBER_NOT_FOUND" };
  }

  if (actor.role !== "leader" && actor.role !== "officer") {
    return { error: "PERMISSION_DENIED" };
  }

  if (actor.role === "officer" && target.role === "leader") {
    return { error: "CANNOT_KICK_LEADER" };
  }

  if (actor.role === "officer" && target.role === "officer") {
    return { error: "PERMISSION_DENIED" };
  }

  const updatedMembers = squad.members.filter((m) => m.id !== targetId);
  return {
    success: true,
    squad: {
      ...squad,
      members: updatedMembers,
      memberCount: updatedMembers.length,
    },
  };
}

export function leaveSquad(
  squad: Squad,
  memberId: string
): { success: boolean; squad: Squad | null; members: SquadMember[] } {
  if (memberId === squad.leaderId) {
    const departure = handleLeaderDeparture(squad, memberId);
    return {
      success: true,
      squad: departure.squad,
      members: departure.members,
    };
  }

  const updatedMembers = squad.members.filter((m) => m.id !== memberId);
  const updatedSquad: Squad = {
    ...squad,
    members: updatedMembers,
    memberCount: updatedMembers.length,
  };

  return {
    success: true,
    squad: updatedSquad,
    members: updatedMembers,
  };
}

export function handleLeaderDeparture(
  squad: Squad,
  leaderId: string
): { squad: Squad | null; leaderId?: string; members: SquadMember[] } {
  const remaining = squad.members.filter((m) => m.id !== leaderId);
  if (remaining.length === 0) {
    return {
      squad: null,
      leaderId: undefined,
      members: [],
    };
  }

  // Priority to senior officer, else earliest joined remaining member
  const seniorOfficer = remaining.find((m) => m.role === "officer") || remaining[0];
  const newLeaderId = seniorOfficer.id;

  const updatedMembers = remaining.map((m) =>
    m.id === newLeaderId ? { ...m, role: "leader" as SquadRole } : m
  );

  const updatedSquad: Squad = {
    ...squad,
    leaderId: newLeaderId,
    members: updatedMembers,
    memberCount: updatedMembers.length,
  };

  return {
    squad: updatedSquad,
    leaderId: newLeaderId,
    members: updatedMembers,
  };
}

export function createSpatialVoiceRoom(squadId: string): SquadVoiceRoomState {
  const roomId = "squad-voice-" + squadId;
  return {
    roomId,
    active: true,
    channelId: roomId,
    activeSpeakers: [],
    participants: {},
    startedAt: Date.now(),
    fallbackMode: false,
  };
}

export function updateVoiceSpeaking(
  room: SquadVoiceRoomState,
  peerId: string,
  isSpeaking: boolean
): SquadVoiceRoomState {
  let activeSpeakers = [...room.activeSpeakers];
  if (isSpeaking) {
    if (!activeSpeakers.includes(peerId)) {
      activeSpeakers.push(peerId);
    }
  } else {
    activeSpeakers = activeSpeakers.filter((id) => id !== peerId);
  }

  return {
    ...room,
    activeSpeakers,
  };
}

export function handleVoiceFallback(
  room: SquadVoiceRoomState,
  error: Error | any
): SquadVoiceRoomState {
  return {
    ...room,
    fallbackMode: true,
    fallbackReason: error?.message || "LiveKitUnavailable",
  };
}

export const DEFAULT_LOCAL_SYNDICATES: Squad[] = [
  {
    id: "SQ-APEX",
    name: "Apex Syndicate",
    tag: "[APEX]",
    description: "High-tier competitive bracket specialists and speedrunners.",
    leaderId: "bot_apex",
    members: [
      { id: "bot_apex", name: "Apex [Bot]", role: "leader", joinedAt: 1700000000000, isOnline: true },
      { id: "bot_viper", name: "Viper [Bot]", role: "officer", joinedAt: 1700001000000, isOnline: true },
    ],
    memberCount: 2,
    capacity: 8,
    maxMembers: 8,
    isOpen: true,
    trophies: 4200,
    createdAt: 1700000000000,
  },
  {
    id: "SQ-NEON",
    name: "Neon Phantoms",
    tag: "[NEON]",
    description: "Cyber reflex circuit and quantum tachyon runners.",
    leaderId: "bot_viper",
    members: [
      { id: "bot_viper", name: "Viper [Bot]", role: "leader", joinedAt: 1700000000000, isOnline: true },
      { id: "bot_echo", name: "Echo [Bot]", role: "member", joinedAt: 1700002000000, isOnline: true },
    ],
    memberCount: 2,
    capacity: 8,
    maxMembers: 8,
    isOpen: true,
    trophies: 3100,
    createdAt: 1700000000000,
  },
];
