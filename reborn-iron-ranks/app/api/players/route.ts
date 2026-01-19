import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only

  return createClient(url, service || anon);
}

export async function GET() {
  const sb = supabase();

  const { data, error } = await sb
    .from("player_profiles")
    .select("id, rsn, join_date, scaling")
    .order("rsn", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, players: data ?? [] });
}
