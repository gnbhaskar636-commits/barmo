export type PlatformRole = "admin" | "moderator" | "player" | "guest";

export type AdminPermission =
  | "diagnostics:view"
  | "moderation:mute"
  | "moderation:kick"
  | "moderation:ban"
  | "broadcast:send"
  | "audit:read"
  | "audit:export";

export const ROLE_PERMISSIONS: Record<PlatformRole, AdminPermission[]> = Object.assign(
  Object.create(null) as Record<PlatformRole, AdminPermission[]>,
  {
    admin: [
      "diagnostics:view",
      "moderation:mute",
      "moderation:kick",
      "moderation:ban",
      "broadcast:send",
      "audit:read",
      "audit:export",
    ],
    moderator: [
      "diagnostics:view",
      "moderation:mute",
      "moderation:kick",
      "audit:read",
    ],
    player: [],
    guest: [],
  }
);

export function hasPermission(role: PlatformRole, permission: AdminPermission): boolean {
  if (typeof role !== "string" || !Object.hasOwn(ROLE_PERMISSIONS, role)) return false;
  const perms = ROLE_PERMISSIONS[role];
  return Array.isArray(perms) ? perms.includes(permission) : false;
}
