// app/api/players/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only
  return createClient(url, service || anon);
}

// In some Next versions, Route Handler `params` can be a Promise.
// So we type it that way and always await it.
type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/players/:id  -> used by /calculator/[id]/page.tsx
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const sb = supabase();
  const { data, error } = await sb
    .from("player_profiles")
    .select("id, rsn, join_date, scaling")
    .eq("id", id)
    .maybeSingle();

  // maybeSingle() returns null data with no error when not found
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, player: data }, { status: 200 });
}

/**
 * DELETE /api/players/:id
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const sb = supabase();
  const { error } = await sb.from("player_profiles").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
