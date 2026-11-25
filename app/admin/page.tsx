import type { Metadata } from "next";
import { cookies } from "next/headers";
import AppShell from "@/components/app/AppShell";
import { ModerationHUD } from "@/components/admin/ModerationHUD";
import { hasPermission, type PlatformRole } from "@/lib/admin/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Operations & Moderation HUD — BARMO",
  description: "Administrative console for platform telemetry, diagnostics, and universe moderation.",
  robots: {
    index: false,
    follow: false,
  },
};

function resolveServerRole(adminTokenCookie?: string): PlatformRole {
  const configuredSecret = process.env.BARMO_ADMIN_SECRET?.trim();
  if (configuredSecret && adminTokenCookie === configuredSecret) {
    return "admin";
  }
  const envRole = process.env.BARMO_ADMIN_ROLE?.trim();
  if (envRole === "admin" || envRole === "moderator") {
    return envRole;
  }
  return "guest";
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const role = resolveServerRole(cookieStore.get("barmo_admin_token")?.value);
  const authorized = hasPermission(role, "diagnostics:view");

  return (
    <AppShell>
      {authorized ? (
        <ModerationHUD role={role} />
      ) : (
        <ModerationHUD role="guest" />
      )}
    </AppShell>
  );
}
