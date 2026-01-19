import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY; // optional (recommended for server routes)

  const key = service || anon;
  return createClient(url, key);
}

function isISODate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET() {
  const sb = supabase();
  const { data, error } = await sb
    .from("player_profiles")
    .select("id, rsn, join_date, discord_id, scaling")
    .order("rsn", { ascending: true })
    .limit(5);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, sample: data ?? [] });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rsn = (body?.rsn ?? "").toString().trim();
    const discord_id = (body?.discord_id ?? "").toString().trim();

    // Expect yyyy-mm-dd from <input type="date" />
    const join_date = isISODate(body?.join_date) ? body.join_date : null;

    const scalingRaw = body?.scaling;
    const scaling =
      typeof scalingRaw === "number"
        ? scalingRaw
        : typeof scalingRaw === "string" && scalingRaw.trim() !== ""
        ? Number(scalingRaw)
        : 100;

    if (!rsn) {
      return NextResponse.json({ ok: false, error: "Missing rsn" }, { status: 400 });
    }
    if (!discord_id) {
      return NextResponse.json(
        { ok: false, error: "Missing discord_id" },
        { status: 400 }
      );
    }

    // ✅ Generate UUID in the API (backup fix if DB isn't generating it)
    const id = crypto.randomUUID();

    const sb = supabase();

    const { data, error } = await sb
      .from("player_profiles")
      .insert({
        id,
        rsn,
        discord_id,
        join_date,
        scaling,
      })
      .select("id, rsn, join_date, discord_id, scaling")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, player: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
