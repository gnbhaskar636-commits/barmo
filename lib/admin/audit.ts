import { load, save } from "@/lib/social/store";
import type { ModerationAuditEntry, ModerationAction } from "./moderation";

const STORAGE_KEY = "audit_logs";
const MAX_AUDIT_LOGS = 1000;
let memoryLogs: ModerationAuditEntry[] | null = null;

function cloneEntry(entry: ModerationAuditEntry): ModerationAuditEntry {
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

function loadLogs(): ModerationAuditEntry[] {
  if (memoryLogs !== null) return memoryLogs;
  try {
    const raw = load<ModerationAuditEntry[]>(STORAGE_KEY, []);
    memoryLogs = Array.isArray(raw) ? raw.slice(-MAX_AUDIT_LOGS).map(cloneEntry) : [];
  } catch {
    memoryLogs = [];
  }
  return memoryLogs;
}

export function recordAuditEvent(entry: ModerationAuditEntry): void {
  const logs = loadLogs();
  logs.push(cloneEntry(entry));
  if (logs.length > MAX_AUDIT_LOGS) {
    logs.splice(0, logs.length - MAX_AUDIT_LOGS);
  }
  try {
    save(STORAGE_KEY, logs.slice(-MAX_AUDIT_LOGS));
  } catch {
    // Storage quota fallback
  }
}

export function getAuditLogs(filter?: {
  action?: ModerationAction;
  targetId?: string;
  moderatorId?: string;
  limit?: number;
}): ModerationAuditEntry[] {
  let logs = loadLogs().map(cloneEntry);
  if (filter?.action) {
    logs = logs.filter((l) => l.action === filter.action);
  }
  if (filter?.targetId) {
    logs = logs.filter((l) => l.targetId === filter.targetId);
  }
  if (filter?.moderatorId) {
    logs = logs.filter((l) => l.moderatorId === filter.moderatorId);
  }
  if (filter?.limit && filter.limit > 0) {
    logs = logs.slice(-filter.limit);
  }
  return logs;
}

export function exportAuditLogsJson(): string {
  return JSON.stringify(loadLogs(), null, 2);
}

export function clearAuditLogs(): void {
  memoryLogs = [];
  try {
    save(STORAGE_KEY, []);
  } catch {
    // Ignore
  }
}
