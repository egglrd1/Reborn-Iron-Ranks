// lib/serverAdmin.ts
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function mustEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function supabaseAdmin() {
  // IMPORTANT: do NOT use NEXT_PUBLIC keys here. Service role must remain server-only.
  const url = mustEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function isAdminDiscordId(discordId: string) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("admin_users")
    .select("discord_id")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const discordId = (session as any)?.discordId ? String((session as any).discordId) : null;
  if (!discordId) return { ok: false as const, status: 401 as const, discordId: null, session };

  const ok = await isAdminDiscordId(discordId);
  if (!ok) return { ok: false as const, status: 403 as const, discordId, session };

  return { ok: true as const, status: 200 as const, discordId, session };
}