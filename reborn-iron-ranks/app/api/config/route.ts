// app/api/config/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const key = service || anon; // prefer service role so this never RLS-blocks
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = sb();

  const { data, error } = await supabase
    .from("config_versions")
    .select("id, created_at, config_json")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data?.id ?? null,
    created_at: data?.created_at ?? null,
    config: data?.config_json ?? null,
  });
}