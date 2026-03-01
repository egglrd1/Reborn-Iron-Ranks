// app/api/admin/wiki/items/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, { auth: { persistSession: false } });
}

async function assertAdmin() {
  const session: any = await getServerSession(authOptions);
  const discordId = session?.discordId;
  if (!discordId) return { ok: false as const, status: 401, error: "Not signed in" };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("admin_users")
    .select("discord_id, role")
    .eq("discord_id", String(discordId))
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: error.message };
  if (!data) return { ok: false as const, status: 403, error: "Not an admin" };

  return { ok: true as const };
}

type WikiHit = { title: string };

async function wikiSearch(q: string): Promise<WikiHit[]> {
  const url =
    "https://oldschool.runescape.wiki/api.php" +
    `?action=opensearch&search=${encodeURIComponent(q)}&limit=10&namespace=0&format=json&origin=*`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();

  // opensearch: [query, [titles], [descs], [urls]]
  const titles: string[] = Array.isArray(j?.[1]) ? j[1] : [];
  return titles.map((t) => ({ title: t }));
}

async function wikiThumb(title: string): Promise<string | null> {
  const url =
    "https://oldschool.runescape.wiki/api.php" +
    `?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=80&format=json&origin=*`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  const pages = j?.query?.pages ?? {};
  const first = Object.values(pages)[0] as any;
  return first?.thumbnail?.source ?? null;
}

export async function GET(req: Request) {
  const gate = await assertAdmin();
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return json({ ok: true, items: [] });

  const hits = await wikiSearch(q);

  // thumbs in parallel (fast)
  const thumbs = await Promise.all(hits.map((h) => wikiThumb(h.title).catch(() => null)));

  const items = hits.map((h, i) => ({ title: h.title, thumb: thumbs[i] ?? null }));

  return json({ ok: true, items });
}