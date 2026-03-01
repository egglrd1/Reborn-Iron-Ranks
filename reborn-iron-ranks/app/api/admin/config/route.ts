// app/api/admin/config/route.ts
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
  // ✅ Client must send this header from your admin UI
  const h = req.headers.get("x-admin-discord-id") || req.headers.get("x-discord-id") || "";
  const v = h.trim();
  return v ? v : null;
}

async function requireRole(sb: ReturnType<typeof supabaseAdmin>, req: Request, allowed: AdminRole[]) {
  const discordId = getCallerDiscordId(req);
  if (!discordId) {
    return { ok: false as const, status: 401, error: "Missing x-admin-discord-id header" };
  }

  const { data, error } = await sb
    .from("admin_users")
    .select("discord_id,name,role,enabled")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, error: error.message };
  if (!data) return { ok: false as const, status: 403, error: "Not authorized" };
  if (data.enabled === false) return { ok: false as const, status: 403, error: "User disabled" };

  const role = String(data.role || "").toLowerCase() as AdminRole;
  if (!allowed.includes(role)) {
    return { ok: false as const, status: 403, error: `Insufficient role (need ${allowed.join(" or ")})` };
  }

  return {
    ok: true as const,
    discordId: String(data.discord_id),
    role,
    name: data.name ? String(data.name) : null,
  };
}

function coerceSchemaVersion(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function isPlainObject(x: any) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function validateConfig(cfg: any): { ok: true; clean: any } | { ok: false; reason: string; meta?: any } {
  if (!isPlainObject(cfg)) return { ok: false, reason: "config is not an object" };

  const schemaVersion = coerceSchemaVersion(cfg.schemaVersion);
  if (schemaVersion == null) {
    return { ok: false, reason: "schemaVersion must be a number (or numeric string)", meta: { schemaVersion: cfg.schemaVersion } };
  }

  if (!isPlainObject(cfg.itemPoints)) return { ok: false, reason: "itemPoints missing/invalid" };

  const items = cfg.itemPoints.items;
  const reqs = cfg.itemPoints.requiredRequirements;
  const ranks = cfg.pvmRanks;

  if (!Array.isArray(items)) return { ok: false, reason: "itemPoints.items must be an array" };
  if (!Array.isArray(reqs)) return { ok: false, reason: "itemPoints.requiredRequirements must be an array" };
  if (!Array.isArray(ranks)) return { ok: false, reason: "pvmRanks must be an array" };

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!isPlainObject(it)) return { ok: false, reason: `items[${i}] is not an object` };
    if (typeof it.id !== "string" || !it.id.trim()) return { ok: false, reason: `items[${i}].id must be a non-empty string` };
    if (typeof it.name !== "string" || !it.name.trim()) return { ok: false, reason: `items[${i}].name must be a non-empty string` };

    if (!(it.points === null || typeof it.points === "number" || typeof it.points === "undefined")) {
      return { ok: false, reason: `items[${i}].points must be number|null|undefined` };
    }

    if (!(typeof it.enabled === "undefined" || typeof it.enabled === "boolean")) {
      return { ok: false, reason: `items[${i}].enabled must be boolean|undefined` };
    }
    if (!(typeof it.imageUrl === "undefined" || typeof it.imageUrl === "string")) {
      return { ok: false, reason: `items[${i}].imageUrl must be string|undefined` };
    }
    if (!(typeof it.group === "undefined" || typeof it.group === "string")) {
      return { ok: false, reason: `items[${i}].group must be string|undefined` };
    }
    if (!(typeof it.notes === "undefined" || typeof it.notes === "string")) {
      return { ok: false, reason: `items[${i}].notes must be string|undefined` };
    }
  }

  for (let i = 0; i < ranks.length; i++) {
    const r = ranks[i];
    if (!isPlainObject(r)) return { ok: false, reason: `pvmRanks[${i}] is not an object` };
    if (typeof r.id !== "string" || !r.id.trim()) return { ok: false, reason: `pvmRanks[${i}].id must be a non-empty string` };
    if (typeof r.label !== "string" || !r.label.trim()) return { ok: false, reason: `pvmRanks[${i}].label must be a non-empty string` };
    if (!(typeof r.requiresBase === "boolean" || typeof r.requiresBase === "undefined")) {
      return { ok: false, reason: `pvmRanks[${i}].requiresBase must be boolean|undefined` };
    }
    if (!(typeof r.requiresInfernal === "boolean" || typeof r.requiresInfernal === "undefined")) {
      return { ok: false, reason: `pvmRanks[${i}].requiresInfernal must be boolean|undefined` };
    }
    if (!(typeof r.thresholdPoints === "number" || typeof r.thresholdPoints === "undefined")) {
      return { ok: false, reason: `pvmRanks[${i}].thresholdPoints must be number|undefined` };
    }
  }

  const normalized = { ...cfg, schemaVersion };
  const clean = JSON.parse(JSON.stringify(normalized));
  return { ok: true, clean };
}

async function resolveNamesByDiscordId(sb: ReturnType<typeof supabaseAdmin>, discordIds: string[]) {
  const ids = Array.from(new Set(discordIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, string>();

  try {
    const { data, error } = await sb.from("admin_users").select("discord_id,name").in("discord_id", ids);
    if (error) throw error;

    const map = new Map<string, string>();
    for (const row of data ?? []) {
      if ((row as any)?.discord_id && (row as any)?.name) map.set(String((row as any).discord_id), String((row as any).name));
    }
    return map;
  } catch {
    return new Map<string, string>();
  }
}

// GET active config + history
export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin();

    // ✅ allow admin OR owner to read
    const auth = await requireRole(sb, req, ["admin", "owner"]);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

    const { data: active, error: activeErr } = await sb
      .from("config_versions")
      .select("id,name,notes,is_active,created_at,created_by,author_discord_id,config_json")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeErr) throw activeErr;

    const { data: history, error: histErr } = await sb
      .from("config_versions")
      .select("id,name,notes,is_active,created_at,created_by,author_discord_id")
      .order("created_at", { ascending: false })
      .limit(30);

    if (histErr) throw histErr;

    const idsToResolve: string[] = [];
    for (const row of history ?? []) if ((row as any)?.author_discord_id) idsToResolve.push(String((row as any).author_discord_id));
    if ((active as any)?.author_discord_id) idsToResolve.push(String((active as any).author_discord_id));

    const nameMap = await resolveNamesByDiscordId(sb, idsToResolve);

    const historyWithNames = (history ?? []).map((r: any) => {
      const authorDiscordId = r?.author_discord_id ? String(r.author_discord_id) : null;
      const mapped = authorDiscordId ? nameMap.get(authorDiscordId) : null;
      return {
        ...r,
        author_name: mapped ?? (r?.created_by ? String(r.created_by) : null),
      };
    });

    const activeWithName = active
      ? {
          ...(active as any),
          author_name: (active as any).author_discord_id
            ? nameMap.get(String((active as any).author_discord_id)) ?? ((active as any).created_by ? String((active as any).created_by) : null)
            : ((active as any).created_by ? String((active as any).created_by) : null),
        }
      : null;

    return json({
      ok: true,
      active: activeWithName,
      history: historyWithNames,
      me: { discord_id: auth.discordId, role: auth.role, name: auth.name },
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
}

// POST publish OR rollback
export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();

    // ✅ owner-only for publish/rollback
    const auth = await requireRole(sb, req, ["owner"]);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid body (not JSON)" }, 400);
    }

    // ---- ROLLBACK ----
    if (body?.action === "rollback") {
      const id = typeof body?.id === "string" ? body.id : "";
      if (!id) return json({ ok: false, error: "Missing rollback id" }, 400);

      const { error: deactErr } = await sb.from("config_versions").update({ is_active: false }).eq("is_active", true);
      if (deactErr) throw deactErr;

      const { error: actErr } = await sb.from("config_versions").update({ is_active: true }).eq("id", id);
      if (actErr) throw actErr;

      return json({ ok: true, id });
    }

    // ---- PUBLISH ----
    const cfg = body?.configJson ?? body?.config ?? body?.config_json ?? null;
    const notes = typeof body?.notes === "string" ? body.notes : null;

    if (!cfg) {
      return json(
        {
          ok: false,
          error: "Invalid body: missing configJson",
          receivedKeys: body && typeof body === "object" ? Object.keys(body) : null,
        },
        400
      );
    }

    const validated = validateConfig(cfg);
    if (!validated.ok) {
      return json(
        {
          ok: false,
          error: "Invalid body: configJson has wrong shape",
          reason: validated.reason,
          meta: validated.meta ?? null,
        },
        400
      );
    }

    const { error: deactErr } = await sb.from("config_versions").update({ is_active: false }).eq("is_active", true);
    if (deactErr) throw deactErr;

    const name = `Publish ${new Date().toISOString()}`;

    const insertRow: any = {
      name,
      notes,
      config_json: validated.clean,
      is_active: true,
      // ✅ authoritative author from auth (not client body)
      author_discord_id: auth.discordId,
      created_by: auth.name ?? auth.discordId,
    };

    const { data, error: insErr } = await sb.from("config_versions").insert(insertRow).select("id").single();
    if (insErr) throw insErr;

    return json({ ok: true, id: data.id });
  } catch (e: any) {
    return json(
      {
        ok: false,
        error: e?.message ?? String(e),
        code: e?.code ?? null,
        details: e?.details ?? null,
        hint: e?.hint ?? null,
      },
      500
    );
  }
}