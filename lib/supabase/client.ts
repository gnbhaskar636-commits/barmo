"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);
}

function validateSupabaseConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the legacy " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY) in the environment."
    );
  }

  let url: URL;
  try {
    url = new URL(SUPABASE_URL);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.");
  }
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  ) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS (HTTP is allowed for local development).");
  }

  if (!SUPABASE_PUBLIC_KEY.startsWith("sb_publishable_")) {
    const segments = SUPABASE_PUBLIC_KEY.split(".");
    if (segments.length !== 3) {
      throw new Error(
        "The Supabase browser key must be a publishable key or a legacy anon key."
      );
    }

    let role: string | undefined;
    try {
      const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      const decoded = atob(padded);
      const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
      const claims = JSON.parse(new TextDecoder().decode(bytes)) as { role?: string };
      role = claims.role;
    } catch {
      throw new Error(
        "The Supabase browser key must be a publishable key or a legacy anon key."
      );
    }

    if (role === "service_role") {
      throw new Error(
        "A Supabase service-role key cannot be used in the browser. Set the project's publishable key instead."
      );
    }
    if (role !== "anon") {
      throw new Error(
        "The Supabase browser key must be a publishable key or a legacy anon key."
      );
    }
  }
}

/** Public browser client for anonymous Realtime use; it never persists Auth sessions. */
export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    validateSupabaseConfig();
    client = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
