// app/api/admin/players/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const discordId = (session as any)?.discordId as string | undefined;

  if (!discordId) {
    return { ok: false as const, status: 401, msg: "Unauthorized" };
  }

  const sb = sbAdmin();
  const { data, error } = await sb
    .from("admin_users")
    .select("discord_id, enabled")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error || !data || data.enabled !== true) {
    return { ok: false as const, status: 403, msg: "Forbidden" };
  }

  return { ok: true as const, discordId };
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.msg }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  const sb = sbAdmin();

  // target table that powers /players
  const TABLE = "player_profiles";

  if (action === "stats") {
    const { count } = await sb.from(TABLE).select("*", { count: "exact", head: true });
    return NextResponse.json({ ok: true, count: count ?? 0 });
  }

  if (action === "clear_all") {
    // delete everything
    const { error } = await sb.from(TABLE).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "clear_stale") {
    const hours = Number(body?.hours ?? 2);
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Requires player_profiles.created_at to exist (timestamptz default now()).
    const { count } = await sb
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .lt("created_at", cutoff);

    const { error } = await sb.from(TABLE).delete().lt("created_at", cutoff);
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          hint: `This needs ${TABLE}.created_at (timestamptz default now()).`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, deleted: count ?? 0, cutoff });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}