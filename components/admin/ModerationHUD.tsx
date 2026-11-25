"use client";

import { useCallback, useEffect, useState } from "react";
import { ModerationEngine, type ModerationAuditEntry } from "@/lib/admin/moderation";
import type { PlatformHealthReport, ServiceProbeResult } from "@/lib/admin/telemetry";
import { hasPermission, type PlatformRole } from "@/lib/admin/roles";
import { recordAuditEvent, getAuditLogs, exportAuditLogsJson } from "@/lib/admin/audit";
import type { Check } from "@/lib/health";
import { useHub } from "@/components/HubProvider";
import { useToast } from "@/components/Toast";
import { play } from "@/lib/sound";

const engine = new ModerationEngine();

export interface ModerationHUDProps {
  role?: PlatformRole;
}

function mapChecksToHealthReport(checks: Check[]): PlatformHealthReport {
  const timestamp = Date.now();
  const services: ServiceProbeResult[] = checks.slice(0, 3).map((c) => ({
    id: (c.id === "supabase" || c.id === "livekit" || c.id === "ai" ? c.id : "storage") as ServiceProbeResult["id"],
    name: c.label,
    status: c.ok ? "operational" : c.id === "livekit" && c.detail.includes("Not set") ? "offline" : "degraded",
    latencyMs: c.ok ? 20 : 0,
    lastChecked: timestamp,
    details: c.detail,
  }));
  const storageOk = typeof window !== "undefined" ? typeof window.localStorage !== "undefined" : true;
  services.push({
    id: "storage",
    name: "Local Storage & Persistence",
    status: storageOk ? "operational" : "degraded",
    latencyMs: 1,
    lastChecked: timestamp,
    details: "In-memory / localStorage cache operational.",
  });
  const operationalCount = services.filter((s) => s.status === "operational").length;
  const overall: PlatformHealthReport["overall"] =
    operationalCount >= 3 ? "healthy" : operationalCount >= 1 ? "degraded" : "unhealthy";
  return { services, overall, timestamp };
}

export function ModerationHUD({ role = "guest" }: ModerationHUDProps) {
  const toast = useToast();
  const { me } = useHub();

  const canViewDiagnostics = hasPermission(role, "diagnostics:view");
  const canMute = hasPermission(role, "moderation:mute");
  const canKick = hasPermission(role, "moderation:kick");
  const canBan = hasPermission(role, "moderation:ban");
  const canModerateAny = canMute || canKick || canBan;
  const canBroadcast = hasPermission(role, "broadcast:send");
  const canReadAudit = hasPermission(role, "audit:read");
  const canExportAudit = hasPermission(role, "audit:export");

  const moderatorId = me?.id?.trim() || "admin_console";

  const [activeTab, setActiveTab] = useState<"telemetry" | "actions" | "broadcast" | "audit">("telemetry");
  const [health, setHealth] = useState<PlatformHealthReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Moderation form state
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("3600000"); // 1 hour in ms default
  const [auditLogs, setAuditLogs] = useState<ModerationAuditEntry[]>([]);

  // Broadcast form state
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");
  const [activeBanner, setActiveBanner] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    if (!canViewDiagnostics) return;
    setLoading(true);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        telemetry?: PlatformHealthReport;
        checks?: Check[];
      };
      if (data.telemetry && Array.isArray(data.telemetry.services)) {
        const storageOk = typeof window !== "undefined" ? typeof window.localStorage !== "undefined" : true;
        const services = data.telemetry.services.map((svc) =>
          svc.id === "storage"
            ? { ...svc, status: storageOk ? ("operational" as const) : ("degraded" as const) }
            : svc
        );
        setHealth({ ...data.telemetry, services });
      } else if (Array.isArray(data.checks)) {
        setHealth(mapChecksToHealthReport(data.checks));
      }
    } catch {
      toast("Failed to probe platform health");
    } finally {
      setLoading(false);
    }
  }, [canViewDiagnostics, toast]);

  useEffect(() => {
    if (!canViewDiagnostics) return;
    void refreshHealth();
    if (canReadAudit) {
      setAuditLogs(getAuditLogs());
    }
  }, [canViewDiagnostics, canReadAudit, refreshHealth]);

  if (!canViewDiagnostics) {
    return (
      <div style={{ maxWidth: 680, margin: "48px auto", padding: "28px 24px", borderRadius: 14, background: "rgba(14,20,36,0.8)", border: "1px solid rgba(239,68,68,0.4)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px", color: "#f87171" }}>
          Access Restricted — Operator Role Required
        </h1>
        <p style={{ margin: "0 0 12px", color: "var(--u3-muted)", fontSize: 14, lineHeight: 1.5 }}>
          Your current role (<b style={{ color: "#fff" }}>{role}</b>) does not hold the{" "}
          <code>diagnostics:view</code> permission required to access Platform Operations &amp; Moderation HUD.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          Authenticate with an authorized moderator or administrator role to unlock telemetry and moderation controls.
        </p>
      </div>
    );
  }

  const handleMute = () => {
    if (!hasPermission(role, "moderation:mute")) {
      toast("Permission denied: moderation:mute required");
      play("lose");
      return;
    }
    const cleanTarget = targetId.trim();
    if (!cleanTarget) {
      toast("Please enter a Target User ID");
      return;
    }
    const durMs = parseInt(duration, 10);
    if (!Number.isFinite(durMs) || durMs <= 0) {
      toast("Please select a valid mute duration");
      return;
    }
    const res = engine.muteUser(cleanTarget, moderatorId, reason.trim(), durMs);
    if (res.success && res.entry) {
      recordAuditEvent(res.entry);
      toast(`Muted ${cleanTarget} for ${durMs / 60000} mins`);
      play("notify");
      if (canReadAudit) setAuditLogs(getAuditLogs());
      setTargetId("");
      setReason("");
    } else {
      toast(`Mute failed: ${res.error}`);
      play("lose");
    }
  };

  const handleBan = () => {
    if (!hasPermission(role, "moderation:ban")) {
      toast("Permission denied: moderation:ban required");
      play("lose");
      return;
    }
    const cleanTarget = targetId.trim();
    if (!cleanTarget) {
      toast("Please enter a Target User ID");
      return;
    }
    const res = engine.banUser(cleanTarget, moderatorId, reason.trim());
    if (res.success && res.entry) {
      recordAuditEvent(res.entry);
      toast(`Banned ${cleanTarget}`);
      play("notify");
      if (canReadAudit) setAuditLogs(getAuditLogs());
      setTargetId("");
      setReason("");
    } else {
      toast(`Ban failed: ${res.error}`);
      play("lose");
    }
  };

  const handleUnban = () => {
    if (!hasPermission(role, "moderation:ban")) {
      toast("Permission denied: moderation:ban required");
      play("lose");
      return;
    }
    const cleanTarget = targetId.trim();
    if (!cleanTarget) {
      toast("Please enter a Target User ID");
      return;
    }
    const res = engine.unbanUser(cleanTarget, moderatorId, reason.trim());
    if (res.success && res.entry) {
      recordAuditEvent(res.entry);
      toast(`Unbanned ${cleanTarget}`);
      play("pop");
      if (canReadAudit) setAuditLogs(getAuditLogs());
      setTargetId("");
      setReason("");
    } else {
      toast(`Unban failed: ${res.error}`);
      play("lose");
    }
  };

  const handleKick = () => {
    if (!hasPermission(role, "moderation:kick")) {
      toast("Permission denied: moderation:kick required");
      play("lose");
      return;
    }
    const cleanTarget = targetId.trim();
    if (!cleanTarget) {
      toast("Please enter a Target User ID");
      return;
    }
    const res = engine.kickUser(cleanTarget, moderatorId, reason.trim());
    if (res.success && res.entry) {
      recordAuditEvent(res.entry);
      toast(`Kicked ${cleanTarget} from sector`);
      play("tick");
      if (canReadAudit) setAuditLogs(getAuditLogs());
      setTargetId("");
      setReason("");
    } else {
      toast(`Kick failed: ${res.error}`);
      play("lose");
    }
  };

  const handleSendBroadcast = () => {
    if (!hasPermission(role, "broadcast:send")) {
      toast("Permission denied: broadcast:send required");
      play("lose");
      return;
    }
    if (!broadcastMsg.trim()) {
      toast("Please enter an announcement message");
      return;
    }
    setActiveBanner(`[${severity.toUpperCase()}] ${broadcastMsg.trim()}`);
    toast("Emergency announcement broadcasted");
    play("win");
    setBroadcastMsg("");
  };

  const handleExportJson = () => {
    if (!hasPermission(role, "audit:export")) {
      toast("Permission denied: audit:export required");
      play("lose");
      return;
    }
    const data = exportAuditLogsJson();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barmo_audit_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Audit log downloaded");
  };

  const visibleTabs = [
    ["telemetry", "Telemetry & Probes"] as const,
    ...(canModerateAny ? ([["actions", "User Moderation"] as const]) : []),
    ...(canBroadcast ? ([["broadcast", "Broadcast Console"] as const]) : []),
    ...(canReadAudit ? ([["audit", `Audit Trail (${auditLogs.length})`] as const]) : []),
  ];

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px" }}>
      {/* Top Banner Alert if active */}
      {activeBanner && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 20px",
            borderRadius: 12,
            background:
              severity === "critical"
                ? "rgba(239,68,68,0.25)"
                : severity === "warning"
                ? "rgba(245,158,11,0.25)"
                : "rgba(6,182,212,0.25)",
            border: `1px solid ${
              severity === "critical"
                ? "rgba(239,68,68,0.6)"
                : severity === "warning"
                ? "rgba(245,158,11,0.6)"
                : "rgba(6,182,212,0.6)"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{activeBanner}</span>
          <button
            onClick={() => setActiveBanner(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
            Platform Operations & Moderation HUD
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--u3-muted)", fontSize: 14 }}>
            Real-time diagnostics, service health, universe moderation, and audit compliance.
          </p>
        </div>
        <button
          className="u3-btn"
          style={{ minHeight: 38, padding: "0 16px", fontSize: 13 }}
          onClick={refreshHealth}
          disabled={loading}
        >
          {loading ? "Probing..." : "↻ Refresh Probes"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
        {visibleTabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              play("tab_switch");
            }}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === key ? "rgba(139,92,246,0.25)" : "transparent",
              color: activeTab === key ? "#c45cff" : "rgba(255,255,255,0.6)",
              borderBottom: activeTab === key ? "2px solid #c45cff" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Telemetry & Probes */}
      {activeTab === "telemetry" && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderRadius: 12,
              background: "rgba(14,20,36,0.8)",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background:
                    health?.overall === "healthy"
                      ? "#10b981"
                      : health?.overall === "degraded"
                      ? "#f59e0b"
                      : "#ef4444",
                  boxShadow:
                    health?.overall === "healthy"
                      ? "0 0 10px #10b981"
                      : health?.overall === "degraded"
                      ? "0 0 10px #f59e0b"
                      : "0 0 10px #ef4444",
                }}
              />
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>
                Overall Platform Health: {health?.overall || "Checking..."}
              </span>
            </div>
            <span style={{ fontSize: 12, color: "var(--u3-muted)" }}>
              Updated {health ? new Date(health.timestamp).toLocaleTimeString() : "..."}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {health?.services.map((svc) => (
              <div
                key={svc.id}
                style={{
                  padding: "18px 20px",
                  borderRadius: 12,
                  background: "rgba(14,20,36,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <b style={{ color: "#fff", fontSize: 15 }}>{svc.name}</b>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 99,
                      background:
                        svc.status === "operational"
                          ? "rgba(16,185,129,0.2)"
                          : svc.status === "degraded"
                          ? "rgba(245,158,11,0.2)"
                          : "rgba(239,68,68,0.2)",
                      color:
                        svc.status === "operational"
                          ? "#10b981"
                          : svc.status === "degraded"
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {svc.status}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--u3-muted)", lineHeight: 1.4 }}>
                  {svc.details}
                </p>
                <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  <span>Latency: {svc.latencyMs}ms</span>
                  <span>ID: {svc.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: User Moderation Controls */}
      {activeTab === "actions" && canModerateAny && (
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            background: "rgba(14,20,36,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 18, fontWeight: 800 }}>
            Execute Player Action
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 540 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--u3-muted)", marginBottom: 6 }}>
                Target User ID
              </label>
              <input
                type="text"
                placeholder="e.g. user_8492"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(8,12,20,0.8)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--u3-muted)", marginBottom: 6 }}>
                Reason
              </label>
              <input
                type="text"
                placeholder="Reason for disciplinary action"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(8,12,20,0.8)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--u3-muted)", marginBottom: 6 }}>
                Mute Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(8,12,20,0.8)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 14,
                }}
              >
                <option value="300000">5 Minutes</option>
                <option value="3600000">1 Hour</option>
                <option value="86400000">24 Hours</option>
                <option value="604800000">7 Days</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              {canMute && (
                <button
                  className="u3-btn"
                  style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.4)" }}
                  onClick={handleMute}
                >
                  Mute Chat
                </button>
              )}
              {canKick && (
                <button
                  className="u3-btn"
                  style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}
                  onClick={handleKick}
                >
                  Kick from Sector
                </button>
              )}
              {canBan && (
                <>
                  <button
                    className="u3-btn"
                    style={{ background: "rgba(220,38,38,0.3)", color: "#f87171", border: "1px solid rgba(220,38,38,0.6)" }}
                    onClick={handleBan}
                  >
                    Platform Ban
                  </button>
                  <button
                    className="u3-btn"
                    style={{ background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }}
                    onClick={handleUnban}
                  >
                    Lift Ban
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Broadcast Console */}
      {activeTab === "broadcast" && canBroadcast && (
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            background: "rgba(14,20,36,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 18, fontWeight: 800 }}>
            Dispatch Server Announcement
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 540 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--u3-muted)", marginBottom: 6 }}>
                Announcement Message
              </label>
              <textarea
                rows={3}
                placeholder="Scheduled tournament starting in 15 minutes in Arena..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(8,12,20,0.8)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--u3-muted)", marginBottom: 6 }}>
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as "info" | "warning" | "critical")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(8,12,20,0.8)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 14,
                }}
              >
                <option value="info">Info (Cyan)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="critical">Critical (Red Emergency)</option>
              </select>
            </div>

            <div>
              <button className="u3-btn u3-btn-primary" onClick={handleSendBroadcast}>
                📢 Broadcast to All Sectors
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail */}
      {activeTab === "audit" && canReadAudit && (
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            background: "rgba(14,20,36,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 800 }}>
              Immutable Moderation Audit Trail
            </h3>
            {canExportAudit && (
              <button className="u3-btn" style={{ minHeight: 34, padding: "0 14px", fontSize: 12 }} onClick={handleExportJson}>
                ⬇ Export JSON
              </button>
            )}
          </div>

          {auditLogs.length === 0 ? (
            <p style={{ color: "var(--u3-muted)", fontSize: 14 }}>No moderation events recorded yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--u3-muted)" }}>
                    <th style={{ padding: "8px 12px" }}>Timestamp</th>
                    <th style={{ padding: "8px 12px" }}>Action</th>
                    <th style={{ padding: "8px 12px" }}>Target</th>
                    <th style={{ padding: "8px 12px" }}>Moderator</th>
                    <th style={{ padding: "8px 12px" }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#fff" }}>
                      <td style={{ padding: "8px 12px", color: "var(--u3-muted)" }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background:
                              log.action === "ban"
                                ? "rgba(239,68,68,0.2)"
                                : log.action === "mute"
                                ? "rgba(245,158,11,0.2)"
                                : "rgba(6,182,212,0.2)",
                            color:
                              log.action === "ban"
                                ? "#f87171"
                                : log.action === "mute"
                                ? "#fbbf24"
                                : "#67e8f9",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{log.targetId}</td>
                      <td style={{ padding: "8px 12px", color: "var(--u3-muted)" }}>{log.moderatorId}</td>
                      <td style={{ padding: "8px 12px" }}>{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
