export type ModerationAction = "mute" | "unmute" | "kick" | "ban" | "unban" | "warn";

export interface ModerationAuditEntry {
  id: string;
  action: ModerationAction;
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ModerationResult {
  success: boolean;
  error?: string;
  entry?: ModerationAuditEntry;
}

interface MuteRecord {
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: number;
  expiresAt?: number;
}

interface BanRecord {
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: number;
  expiresAt?: number;
}

const MAX_AUDIT_LOGS = 1000;

let counter = 0;
function nextId(): string {
  counter++;
  return `mod_${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 6)}`;
}

function cloneAuditEntry(entry: ModerationAuditEntry): ModerationAuditEntry {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(entry);
    } catch {
      // Fallback for non-cloneable metadata values
    }
  }
  return {
    ...entry,
    metadata: entry.metadata
      ? (JSON.parse(JSON.stringify(entry.metadata)) as Record<string, unknown>)
      : undefined,
  };
}

export class ModerationEngine {
  private muted = new Map<string, MuteRecord>();
  private banned = new Map<string, BanRecord>();
  private auditLog: ModerationAuditEntry[] = [];

  private pushAuditEntry(entry: ModerationAuditEntry): void {
    this.auditLog.push(cloneAuditEntry(entry));
    if (this.auditLog.length > MAX_AUDIT_LOGS) {
      this.auditLog.splice(0, this.auditLog.length - MAX_AUDIT_LOGS);
    }
  }

  canUserChat(userId: string, now: number = Date.now()): boolean {
    const uid = typeof userId === "string" ? userId.trim() : "";
    if (!uid) return true;

    if (this.banned.has(uid)) {
      const ban = this.banned.get(uid);
      if (ban?.expiresAt !== undefined && now >= ban.expiresAt) {
        this.banned.delete(uid);
      } else {
        return false;
      }
    }

    if (this.muted.has(uid)) {
      const mute = this.muted.get(uid);
      if (mute?.expiresAt !== undefined && now >= mute.expiresAt) {
        this.muted.delete(uid);
        return true;
      }
      return false;
    }

    return true;
  }

  canUserJoinWorld(userId: string, now: number = Date.now()): boolean {
    const uid = typeof userId === "string" ? userId.trim() : "";
    if (!uid) return true;

    if (this.banned.has(uid)) {
      const ban = this.banned.get(uid);
      if (ban?.expiresAt !== undefined && now >= ban.expiresAt) {
        this.banned.delete(uid);
        return true;
      }
      return false;
    }
    return true;
  }

  muteUser(targetId: string, moderatorId: string, reason: string, durationMs?: number): ModerationResult {
    const target = typeof targetId === "string" ? targetId.trim() : "";
    const mod = typeof moderatorId === "string" ? moderatorId.trim() : "";
    if (!target || !mod) {
      return { success: false, error: "target and moderator IDs are required" };
    }
    if (target === mod) {
      return { success: false, error: "cannot moderate self" };
    }
    if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs <= 0)) {
      return { success: false, error: "invalid duration" };
    }

    const cleanReason = (typeof reason === "string" ? reason.trim() : "") || "No reason provided";
    const now = Date.now();
    for (const [id, rec] of this.muted) {
      if (rec.expiresAt !== undefined && now >= rec.expiresAt) {
        this.muted.delete(id);
      }
    }
    const expiresAt = typeof durationMs === "number" && durationMs > 0 ? now + durationMs : undefined;

    this.muted.set(target, {
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
      expiresAt,
    });

    const entry: ModerationAuditEntry = {
      id: nextId(),
      action: "mute",
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
      durationMs,
    };
    this.pushAuditEntry(entry);

    return { success: true, entry: cloneAuditEntry(entry) };
  }

  unmuteUser(targetId: string, moderatorId: string, reason = "Unmuted"): ModerationResult {
    const target = typeof targetId === "string" ? targetId.trim() : "";
    const mod = typeof moderatorId === "string" ? moderatorId.trim() : "";
    if (!target || !mod) {
      return { success: false, error: "target and moderator IDs are required" };
    }
    if (target === mod) {
      return { success: false, error: "cannot moderate self" };
    }

    const now = Date.now();
    const existingMute = this.muted.get(target);
    if (existingMute && existingMute.expiresAt !== undefined && now >= existingMute.expiresAt) {
      this.muted.delete(target);
    }

    if (!this.muted.has(target)) {
      return { success: false, error: "user is not muted" };
    }

    this.muted.delete(target);
    const cleanReason = (typeof reason === "string" ? reason.trim() : "") || "No reason provided";

    const entry: ModerationAuditEntry = {
      id: nextId(),
      action: "unmute",
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
    };
    this.pushAuditEntry(entry);

    return { success: true, entry: cloneAuditEntry(entry) };
  }

  banUser(targetId: string, moderatorId: string, reason: string, durationMs?: number): ModerationResult {
    const target = typeof targetId === "string" ? targetId.trim() : "";
    const mod = typeof moderatorId === "string" ? moderatorId.trim() : "";
    if (!target || !mod) {
      return { success: false, error: "target and moderator IDs are required" };
    }
    if (target === mod) {
      return { success: false, error: "cannot moderate self" };
    }
    if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs <= 0)) {
      return { success: false, error: "invalid duration" };
    }

    const now = Date.now();
    for (const [id, rec] of this.banned) {
      if (rec.expiresAt !== undefined && now >= rec.expiresAt) {
        this.banned.delete(id);
      }
    }
    if (this.banned.has(target)) {
      return { success: false, error: "user already banned" };
    }

    const cleanReason = (typeof reason === "string" ? reason.trim() : "") || "No reason provided";
    const expiresAt = typeof durationMs === "number" && durationMs > 0 ? now + durationMs : undefined;

    this.banned.set(target, {
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
      expiresAt,
    });

    const entry: ModerationAuditEntry = {
      id: nextId(),
      action: "ban",
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
      durationMs,
    };
    this.pushAuditEntry(entry);

    return { success: true, entry: cloneAuditEntry(entry) };
  }

  unbanUser(targetId: string, moderatorId: string, reason = "Unbanned"): ModerationResult {
    const target = typeof targetId === "string" ? targetId.trim() : "";
    const mod = typeof moderatorId === "string" ? moderatorId.trim() : "";
    if (!target || !mod) {
      return { success: false, error: "target and moderator IDs are required" };
    }
    if (target === mod) {
      return { success: false, error: "cannot moderate self" };
    }

    const now = Date.now();
    const existingBan = this.banned.get(target);
    if (existingBan && existingBan.expiresAt !== undefined && now >= existingBan.expiresAt) {
      this.banned.delete(target);
    }

    if (!this.banned.has(target)) {
      return { success: false, error: "user is not banned" };
    }

    this.banned.delete(target);
    const cleanReason = (typeof reason === "string" ? reason.trim() : "") || "No reason provided";

    const entry: ModerationAuditEntry = {
      id: nextId(),
      action: "unban",
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
    };
    this.pushAuditEntry(entry);

    return { success: true, entry: cloneAuditEntry(entry) };
  }

  kickUser(targetId: string, moderatorId: string, reason: string): ModerationResult {
    const target = typeof targetId === "string" ? targetId.trim() : "";
    const mod = typeof moderatorId === "string" ? moderatorId.trim() : "";
    if (!target || !mod) {
      return { success: false, error: "target and moderator IDs are required" };
    }
    if (target === mod) {
      return { success: false, error: "cannot moderate self" };
    }

    const cleanReason = (typeof reason === "string" ? reason.trim() : "") || "No reason provided";
    const now = Date.now();

    const entry: ModerationAuditEntry = {
      id: nextId(),
      action: "kick",
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
    };
    this.pushAuditEntry(entry);

    return { success: true, entry: cloneAuditEntry(entry) };
  }

  warnUser(targetId: string, moderatorId: string, reason: string): ModerationResult {
    const target = typeof targetId === "string" ? targetId.trim() : "";
    const mod = typeof moderatorId === "string" ? moderatorId.trim() : "";
    if (!target || !mod) {
      return { success: false, error: "target and moderator IDs are required" };
    }
    if (target === mod) {
      return { success: false, error: "cannot moderate self" };
    }

    const cleanReason = (typeof reason === "string" ? reason.trim() : "") || "No reason provided";
    const now = Date.now();

    const entry: ModerationAuditEntry = {
      id: nextId(),
      action: "warn",
      targetId: target,
      moderatorId: mod,
      reason: cleanReason,
      timestamp: now,
    };
    this.pushAuditEntry(entry);

    return { success: true, entry: cloneAuditEntry(entry) };
  }

  getAuditLogs(): ModerationAuditEntry[] {
    return this.auditLog.map(cloneAuditEntry);
  }

  filterAuditLogs(filter: {
    action?: ModerationAction;
    targetId?: string;
    moderatorId?: string;
  }): ModerationAuditEntry[] {
    return this.auditLog
      .filter((entry) => {
        if (filter.action && entry.action !== filter.action) return false;
        if (filter.targetId && entry.targetId !== filter.targetId) return false;
        if (filter.moderatorId && entry.moderatorId !== filter.moderatorId) return false;
        return true;
      })
      .map(cloneAuditEntry);
  }
}

export function clipString(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  return v.slice(0, maxLen);
}

export function sanitizeControlChars(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[\u0000-\u001f]/g, " ");
}
