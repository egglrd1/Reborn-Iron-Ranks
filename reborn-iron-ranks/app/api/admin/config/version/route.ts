// app/api/admin/config/version/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminRole = "owner" | "admin";

function json(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getCallerDiscordId(req: Request) {
  const h = req.headers.get("x-admin-discord-id") || req.headers.get("x-discord-id") || "";
  const v = h.trim();
  return v ? v : null;
}

async function requireRole(sb: ReturnType<typeof supabaseAdmin>, req: Request, allowed: AdminRole[]) {
  const discordId = getCallerDiscordId(req);
  if (!discordId) return { ok: false as const, status: 401, error: "Missing x-admin-discord-id header" };

  const { data, error } = await sb
    .from("admin_users")
    .select("discord_id,role,enabled")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: error.message };
  if (!data) return { ok: false as const, status: 403, error: "Not authorized" };
  if ((data as any).enabled === false) return { ok: false as const, status: 403, error: "User disabled" };

  const role = String((data as any).role || "").toLowerCase() as AdminRole;
  if (!allowed.includes(role)) return { ok: false as const, status: 403, error: `Insufficient role (need ${allowed.join(" or ")})` };

  return { ok: true as const };
}

export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin();

    // ✅ allow admin OR owner
    const auth = await requireRole(sb, req, ["admin", "owner"]);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    if (!id) return json({ ok: false, error: "Missing id" }, 400);

    const { data, error } = await sb
      .from("config_versions")
      .select("id,config_json")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ ok: false, error: "Not found" }, 404);

    return json({ ok: true, id: (data as any).id, config_json: (data as any).config_json });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
}