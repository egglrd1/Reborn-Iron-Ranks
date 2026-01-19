// app/api/temple/collection-log/route.ts
import { NextResponse } from "next/server";

/**
 * Temple endpoints used:
 * - Collection Log:
 *   https://templeosrs.com/api/collection-log/player_collection_log.php
 * - Pet list (authoritative pet names):
 *   https://templeosrs.com/api/pets/hours.php
 *
 * This route preserves your existing response shape:
 *   { ok: true, temple: <collection-log-payload> }
 *
 * And ADDS (non-breaking) a new field:
 *   petsUnique: number
 *
 * (We keep your pets/petsRow fields if you were using them elsewhere, but
 * petsUnique is now computed from the collection log + pet list, not Petcord.)
 */

export const dynamic = "force-dynamic";

async function fetchJson(url: string) {
  const r = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  const text = await r.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // leave as null
  }

  return { ok: r.ok, status: r.status, json, text };
}

/**
 * Small in-memory cache for the pet name list to avoid refetching constantly in dev.
 * (Still safe in serverless; worst case it just refetches.)
 */
let PET_NAME_CACHE: { at: number; names: Set<string> } | null = null;
const PET_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

async function getPetNameSet(): Promise<Set<string>> {
  const now = Date.now();
  if (PET_NAME_CACHE && now - PET_NAME_CACHE.at < PET_CACHE_TTL_MS) return PET_NAME_CACHE.names;

  const url = "https://templeosrs.com/api/pets/hours.php";
  const res = await fetchJson(url);

  const set = new Set<string>();

  // docs show: %PET%/pet_name, so response is usually an object keyed by pet id/name
  const root = res.json;
  if (root && typeof root === "object") {
    // common patterns:
    // - { data: { ... } }
    // - { ... }
    const data = (root as any).data ?? root;

    if (data && typeof data === "object") {
      // could be object or array
      if (Array.isArray(data)) {
        for (const row of data) {
          const n = String((row as any)?.pet_name ?? "").trim();
          if (n) set.add(n.toLowerCase());
        }
      } else {
        for (const v of Object.values(data)) {
          const n = String((v as any)?.pet_name ?? "").trim();
          if (n) set.add(n.toLowerCase());
        }
      }
    }
  }

  PET_NAME_CACHE = { at: now, names: set };
  return set;
}

/**
 * Extract *obtained* item names from the collection-log payload.
 * We only count names that look like actual item rows (have name + obtained/owned or are part of an "items" list).
 *
 * Note: You already request includemissingitems=0, so obtained-only is typical,
 * but we still guard.
 */
function extractObtainedItemNamesFromCollectionLog(clJson: any): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const root = clJson?.data ?? clJson;

  const push = (s: any) => {
    if (typeof s !== "string") return;
    const t = s.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };

  const walk = (node: any, depth = 0) => {
    if (!node || depth > 12) return;

    if (Array.isArray(node)) {
      for (const v of node) walk(v, depth + 1);
      return;
    }

    if (typeof node === "object") {
      const name =
        (node as any)?.name ??
        (node as any)?.item_name ??
        (node as any)?.itemName ??
        (node as any)?.title ??
        null;

      const obtained =
        (node as any)?.obtained ??
        (node as any)?.owned ??
        (node as any)?.has ??
        (node as any)?.completed ??
        null;

      // If it's clearly an item row and obtained-ish, include it.
      if (typeof name === "string") {
        const ok =
          obtained === null || // many Temple responses omit "obtained" when only obtained items are returned
          obtained === true ||
          obtained === 1 ||
          obtained === "1" ||
          (typeof obtained === "number" && obtained > 0);

        if (ok) push(name);
      }

      for (const v of Object.values(node)) walk(v, depth + 1);
    }
  };

  walk(root);
  return out;
}

function pickFirstPetRow(petsJson: any) {
  const data = petsJson?.data;
  if (!data) return null;

  if (typeof data === "object" && !Array.isArray(data) && ("pet_count" in data || "pets" in data)) {
    return data;
  }
  if (Array.isArray(data) && data.length) return data[0];
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rsn = (searchParams.get("rsn") || searchParams.get("player") || "").trim();

  if (!rsn) {
    return NextResponse.json({ ok: false, error: "Missing rsn query param." }, { status: 400 });
  }

  const clUrl =
    `https://templeosrs.com/api/collection-log/player_collection_log.php` +
    `?player=${encodeURIComponent(rsn)}` +
    `&categories=all` +
    `&includenames=1` +
    `&yearlygains=0` +
    `&categoryhours=0` +
    `&includemissingitems=0` +
    `&onlyitems=0` +
    `&dateformat=unix`;

  // (Optional legacy field — not trusted for your use-case, but kept for compatibility)
  const petsUrl =
    `https://templeosrs.com/api/pets/pet_count.php` +
    `?player=${encodeURIComponent(rsn)}` +
    `&count=1` +
    `&page=1`;

  const [cl, pets, petNames] = await Promise.all([fetchJson(clUrl), fetchJson(petsUrl), getPetNameSet()]);

  if (!cl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Temple collection log request failed.",
        status: cl.status,
        details: cl.json ?? cl.text ?? null,
      },
      { status: 502 }
    );
  }

  // ✅ Compute true unique pets from collection log + authoritative pet-name list
  const obtainedNames = extractObtainedItemNamesFromCollectionLog(cl.json);
  let petsUnique = 0;

  if (petNames && petNames.size) {
    const ownedPetNames = new Set<string>();
    for (const n of obtainedNames) {
      const k = n.toLowerCase();
      if (petNames.has(k)) ownedPetNames.add(k);
    }
    petsUnique = ownedPetNames.size;
  }

  const petsRow = pets.ok ? pickFirstPetRow(pets.json) : null;

  return NextResponse.json({
    ok: true,
    temple: cl.json, // ✅ existing key
    pets: pets.ok ? (pets.json ?? null) : null, // legacy/optional
    petsRow, // legacy/optional
    petsUnique, // ✅ NEW: correct unique pets (not Petcord)
  });
}
