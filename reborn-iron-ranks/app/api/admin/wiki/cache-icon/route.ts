// app/api/admin/wiki/cache-icon/route.ts
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

/**
 * Variant cleanup for wiki title lookup:
 * - Temple may return "Scythe of vitur (uncharged)" etc.
 * - Wiki often has thumbs on the base page, not the variant.
 */
function titleCandidates(title: string): string[] {
  const t = String(title || "").trim();
  if (!t) return [];

  const stripped = t
    .replace(/\s*\((uncharged|inactive|u|damaged|broken|empty|degraded)\)\s*$/i, "")
    .replace(/\s+(uncharged|inactive)\s*$/i, "")
    .replace(/[’]/g, "'")
    .trim();

  const cleaned = stripped.replace(/\s+/g, " ").trim();
  return [...new Set([t, cleaned].filter(Boolean))];
}

async function wikiThumb(title: string): Promise<string | null> {
  const candidates = titleCandidates(title);

  for (const cand of candidates) {
    const url =
      "https://oldschool.runescape.wiki/api.php" +
      `?action=query&titles=${encodeURIComponent(cand)}` +
      `&prop=pageimages&pithumbsize=120` +
      `&redirects=1&format=json&origin=*`;

    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;

      const j = await r.json();
      const pages = j?.query?.pages ?? {};
      const first = Object.values(pages)[0] as any;

      const thumb = first?.thumbnail?.source ?? null;
      if (thumb) return thumb;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function extFromContentType(ct: string | null) {
  const s = (ct ?? "").toLowerCase();
  if (s.includes("png")) return "png";
  if (s.includes("webp")) return "webp";
  if (s.includes("jpeg") || s.includes("jpg")) return "jpg";
  if (s.includes("gif")) return "gif";
  return "png";
}

export async function POST(req: Request) {
  const gate = await assertAdmin();
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const itemId = String(body?.itemId ?? "").trim();

  if (!title || !itemId) {
    return json(
      {
        ok: false,
        error: "Invalid body",
        expected: { itemId: "string", title: "string" },
        receivedKeys: body && typeof body === "object" ? Object.keys(body) : null,
      },
      400
    );
  }

  const thumbUrl = await wikiThumb(title);
  if (!thumbUrl) return json({ ok: false, error: "Wiki thumbnail not found" }, 404);

  const imgRes = await fetch(thumbUrl, { cache: "no-store" });
  if (!imgRes.ok) return json({ ok: false, error: "Failed to download image" }, 502);

  const buf = Buffer.from(await imgRes.arrayBuffer());
  const ct = imgRes.headers.get("content-type");
  const ext = extFromContentType(ct);

  const sb = supabaseAdmin();
  const bucket = "item-icons";

  // Keep your existing convention
  const path = `items/${itemId}.${ext}`;

  const up = await sb.storage.from(bucket).upload(path, buf, {
    upsert: true,
    contentType: ct ?? "image/png",
  });

  if (up.error) return json({ ok: false, error: up.error.message }, 500);

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl;

  return json({ ok: true, imageUrl: publicUrl, path, source: thumbUrl });
}