// app/api/admin/wiki/boss-items/route.ts
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

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleFromSlug(slug: string): string {
  const words = String(slug || "")
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));

  const raw = words.join(" ");
  if (String(slug || "").startsWith("the_")) return "The " + titleFromSlug(String(slug).slice(4));
  return raw;
}

/**
 * Temple endpoints
 */
async function fetchTempleCategoriesRaw(): Promise<any> {
  const r = await fetch("https://templeosrs.com/api/collection-log/categories.php", { cache: "no-store" });
  if (!r.ok) throw new Error(`Temple categories failed (${r.status})`);
  return r.json();
}

async function fetchTempleItemsMapRaw(): Promise<any> {
  const r = await fetch("https://templeosrs.com/api/collection-log/items.php", { cache: "no-store" });
  if (!r.ok) throw new Error(`Temple items map failed (${r.status})`);
  return r.json();
}

function extractItemsMap(root: any): Map<string, string> {
  const map = new Map<string, string>();
  if (!root || typeof root !== "object") return map;

  // items.php is usually { "4151":"Abyssal whip", ... }
  for (const [k, v] of Object.entries(root)) {
    if (/^\d+$/.test(k) && typeof v === "string" && v.trim()) map.set(k, v.trim());
  }

  // lightweight deep walk (rare nested shapes)
  const walk = (node: any, depth = 0) => {
    if (!node || depth > 6) return;
    if (Array.isArray(node)) return node.forEach((x) => walk(x, depth + 1));
    if (typeof node !== "object") return;

    for (const [k, v] of Object.entries(node)) {
      if (/^\d+$/.test(k) && typeof v === "string" && v.trim()) map.set(k, v.trim());
    }
    for (const v of Object.values(node)) walk(v, depth + 1);
  };

  walk(root, 0);
  return map;
}

type TempleIndex = {
  sections: Record<string, Record<string, Array<number | string>>>;
  allBosses: Array<{ section: string; slug: string; title: string; count: number }>;
};

function buildTempleIndex(categoriesRaw: any): TempleIndex {
  const sections: Record<string, Record<string, Array<number | string>>> = {};
  const allBosses: Array<{ section: string; slug: string; title: string; count: number }> = [];

  if (!categoriesRaw || typeof categoriesRaw !== "object") return { sections, allBosses };

  for (const [sectionName, sectionVal] of Object.entries(categoriesRaw)) {
    if (!sectionVal || typeof sectionVal !== "object") continue;

    const sectionObj = sectionVal as Record<string, any>;
    const out: Record<string, Array<number | string>> = {};

    for (const [slug, ids] of Object.entries(sectionObj)) {
      if (!Array.isArray(ids)) continue;
      const cleaned = ids.filter((x) => typeof x === "number" || typeof x === "string");
      if (!cleaned.length) continue;

      out[slug] = cleaned;
      allBosses.push({
        section: sectionName,
        slug,
        title: titleFromSlug(slug),
        count: cleaned.length,
      });
    }

    if (Object.keys(out).length) sections[sectionName] = out;
  }

  return { sections, allBosses };
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

async function wikiThumb(title: string, size = 60): Promise<string | null> {
  const candidates = titleCandidates(title);

  for (const cand of candidates) {
    const url =
      "https://oldschool.runescape.wiki/api.php" +
      `?action=query&titles=${encodeURIComponent(cand)}` +
      `&prop=pageimages&pithumbsize=${size}` +
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
      // keep trying other candidates
    }
  }

  return null;
}

/**
 * ===== In-memory cache (per server instance) =====
 * Prevents Temple fetches per keystroke and reduces intermittent 500s.
 */
type CacheShape = {
  fetchedAt: number;
  index: TempleIndex;
  itemsMap: Map<string, string>;
};

declare global {
  var __REBORN_TEMPLE_CACHE__: CacheShape | undefined;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function loadTempleCached() {
  const now = Date.now();
  const cached = global.__REBORN_TEMPLE_CACHE__;
  const fresh = cached && now - cached.fetchedAt < CACHE_TTL_MS;

  if (fresh) {
    return { cacheHit: true, index: cached.index, itemsMap: cached.itemsMap, error: null as any };
  }

  try {
    const [catsRaw, itemsRaw] = await Promise.all([fetchTempleCategoriesRaw(), fetchTempleItemsMapRaw()]);
    const index = buildTempleIndex(catsRaw);
    const itemsMap = extractItemsMap(itemsRaw);

    global.__REBORN_TEMPLE_CACHE__ = { fetchedAt: now, index, itemsMap };
    return { cacheHit: false, index, itemsMap, error: null as any };
  } catch (e: any) {
    // if Temple is down but we have cached data, serve it
    if (cached) {
      return { cacheHit: true, index: cached.index, itemsMap: cached.itemsMap, error: e };
    }
    return { cacheHit: false, index: { sections: {}, allBosses: [] }, itemsMap: new Map(), error: e };
  }
}

export async function GET(req: Request) {
  const gate = await assertAdmin();
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const bossRaw = (searchParams.get("boss") ?? "").trim();
  const debug = (searchParams.get("debug") ?? "") === "1";

  const loaded = await loadTempleCached();
  const index = loaded.index;
  const itemsMap = loaded.itemsMap;

  const debugBase = debug
    ? {
        cacheHit: loaded.cacheHit,
        categoriesFound: index.allBosses.length,
        itemsMapSize: itemsMap.size,
        templeError: loaded.error ? String(loaded.error?.message ?? loaded.error) : null,
      }
    : undefined;

  // Boss search mode
  if (q && q.length >= 2 && !bossRaw) {
    const nq = norm(q);

    const matches = index.allBosses
      .filter((b) => norm(b.title).includes(nq) || norm(b.slug).includes(nq))
      .sort((a, b) => {
        const aW = a.section === "bosses" ? 0 : a.section === "raids" ? 1 : 2;
        const bW = b.section === "bosses" ? 0 : b.section === "raids" ? 1 : 2;
        if (aW !== bW) return aW - bW;
        return b.count - a.count;
      })
      .slice(0, 30)
      .map((b) => ({ slug: b.slug, title: b.title }));

    return json({
      ok: true,
      mode: "boss_search",
      bosses: matches,
      ...(debug
        ? { debug: { ...debugBase, searched: q, returned: matches.length, sampleBosses: index.allBosses.slice(0, 20) } }
        : {}),
    });
  }

  // Boss items mode
  if (bossRaw) {
    const slug = bossRaw.includes(" ")
      ? bossRaw.trim().replace(/\s+/g, "_").toLowerCase()
      : bossRaw.trim().toLowerCase();

    let foundSection: string | null = null;
    let ids: Array<number | string> | null = null;

    for (const [sectionName, sectionMap] of Object.entries(index.sections)) {
      if (sectionMap && sectionMap[slug]) {
        foundSection = sectionName;
        ids = sectionMap[slug];
        break;
      }
    }

    if (!ids) {
      const near = index.allBosses
        .filter((b) => b.slug.includes(slug) || slug.includes(b.slug) || norm(b.title).includes(norm(bossRaw)))
        .slice(0, 12)
        .map((b) => ({ section: b.section, slug: b.slug, title: b.title, count: b.count }));

      return json({
        ok: true,
        mode: "boss_items",
        bossSlug: slug,
        bossTitle: bossRaw,
        items: [],
        note: "Boss category not found in Temple categories list (or Temple temporarily unavailable).",
        ...(debug ? { debug: { ...debugBase, nearMatches: near, tip: "Try searching with ?q=..." } } : {}),
      });
    }

    const names: string[] = [];
    for (const rawId of ids) {
      const key = String(rawId);
      const nm = itemsMap.get(key);
      if (nm) names.push(nm);
    }

    const uniqNames = [...new Set(names)].filter(Boolean);

    // thumbs best-effort; never let failures 500 the endpoint
    const limited = uniqNames.slice(0, 80);
    const thumbSettled = await Promise.allSettled(limited.map((t) => wikiThumb(t, 60)));

    const items = limited.map((title, i) => ({
      title,
      thumb: thumbSettled[i].status === "fulfilled" ? thumbSettled[i].value ?? null : null,
    }));

    return json({
      ok: true,
      mode: "boss_items",
      bossSlug: slug,
      bossTitle: titleFromSlug(slug),
      items,
      note: `Temple collection log items for this ${foundSection ?? "category"} (plus wiki thumbs best-effort).`,
      ...(debug
        ? { debug: { ...debugBase, picked: { section: foundSection, slug, ids: ids.length }, resolvedNames: uniqNames.length } }
        : {}),
    });
  }

  return json({ ok: true, mode: "noop", bosses: [], items: [] });
}