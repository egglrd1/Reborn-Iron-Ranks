 // app/api/review-request/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { createClient } from "@supabase/supabase-js";

/**
 * ENV REQUIRED:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_STAFF_CHANNEL_ID
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const BodySchema = z.object({
  playerId: z.string().min(1),
  rsn: z.string().min(1),

  // labels
  requestedRank: z.string().min(1),
  requestedRole: z.string().min(1),

  // manual fallback if session not present
  requesterDiscordId: z.string().min(1).optional(),

  notes: z.string().optional().nullable(),

  // client-computed item checklist summary
  itemPointsEarned: z.number().int().nonnegative().optional(),
  itemNextThreshold: z.number().int().nonnegative().optional().nullable(),
  itemQualifiedRankLabel: z.string().optional(),
  itemNextRankLabel: z.string().optional(),

  // used for skilling checks
  totalLevel: z.number().int().nonnegative().optional().nullable(),

  // used for Zamorakian checks (send from calculator page OR modal)
  raidsTotal: z.number().int().nonnegative().optional().nullable(),
  bossKillsTotal: z.number().int().nonnegative().optional().nullable(),

  // pets + collection log (Temple)
  petsUnique: z.number().int().nonnegative().optional().nullable(),
  collectionLogCompleted: z.number().int().nonnegative().optional().nullable(),
});

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function discordCreateMessageWithButtons(args: {
  channelId: string;
  botToken: string;
  content: string;
  requestId: string;
}) {
  const { channelId, botToken, content, requestId } = args;

  const approveId = `review:approve:${requestId}`;
  const denyId = `review:deny:${requestId}`;

  const payload = {
    content,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Approve", custom_id: approveId },
          { type: 2, style: 4, label: "Deny", custom_id: denyId },
        ],
      },
    ],
  };

  const r = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    console.error("[review-request] Discord POST failed", {
      status: r.status,
      url: `https://discord.com/api/v10/channels/${channelId}/messages`,
      body: t,
    });
    throw new Error(`Discord message failed: ${r.status} ${t}`);
  }

  const msg = await r.json();
  return { messageId: String(msg.id), channelId: String(channelId) };
}

function fmtInt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString() : "—";
}

/**
 * ✅ FIXED: your real persistence is player_profiles.
 * - Delete player_profiles row by id.
 * - Attempt players delete, but DO NOT fail the whole request if that fails (prevents false "failed to delete").
 */
async function cleanupPlayer(sb: ReturnType<typeof supabaseAdmin>, playerId: string) {
  const { error: profErr } = await sb.from("player_profiles").delete().eq("id", playerId);
  if (profErr) {
    console.error("[review-request] Failed to delete player_profiles", profErr);
    throw new Error(`Failed clearing player_profiles: ${profErr.message}`);
  }

  // Best-effort cleanup of "players" if it exists; ignore failures.
  try {
    const { error: playerErr } = await sb.from("players").delete().eq("id", playerId);
    if (playerErr) {
      console.warn("[review-request] players delete skipped/failed (ignored):", playerErr.message);
    }
  } catch (e) {
    console.warn("[review-request] players delete threw (ignored):", e);
  }
}

/** ✅ Skilling rank thresholds (by TOTAL LEVEL) — per your Rank Structure modal */
const SKILL_TOTAL_LEVEL_REQ: Record<string, number> = {
  Emerald: 1000,
  Onyx: 1500,
  Zenyte: 2000,
  Maxed: 2376,
};

function skillingCheckLine(requestedRoleLabel: string, totalLevel: number | null | undefined) {
  const req = SKILL_TOTAL_LEVEL_REQ[requestedRoleLabel];
  if (!req) return null; // not a skilling rank
  if (typeof totalLevel !== "number" || !Number.isFinite(totalLevel)) {
    return `• **Skilling check:** ⚠️ verify (missing total level)`;
  }
  const ok = totalLevel >= req;
  return `• **Skilling check:** ${ok ? "✅ matches qualified" : "⚠️ verify"} (${fmtInt(
    totalLevel
  )} / ${fmtInt(req)} total level)`;
}

/** ✅ Zamorakian check — ONE PATH (Raids OR Bossing) */
const ZAM_TARGET_RAIDS = 3000;
const ZAM_TARGET_BOSS_KC = 35000;

function zamorakianCheckLine(
  requestedRoleLabel: string,
  raidsTotal: number | null | undefined,
  bossKillsTotal: number | null | undefined
) {
  if (requestedRoleLabel !== "Zamorakian") return null;

  const raidsOk =
    typeof raidsTotal === "number" && Number.isFinite(raidsTotal) && raidsTotal >= ZAM_TARGET_RAIDS;
  const bossOk =
    typeof bossKillsTotal === "number" &&
    Number.isFinite(bossKillsTotal) &&
    bossKillsTotal >= ZAM_TARGET_BOSS_KC;

  if (typeof raidsTotal !== "number" || typeof bossKillsTotal !== "number") {
    return `• **Zamorakian check:** ⚠️ verify (missing PvM totals)`;
  }

  const ok = raidsOk || bossOk;

  const raidsPart = `Raids ${fmtInt(raidsTotal)}/${fmtInt(ZAM_TARGET_RAIDS)}`;
  const bossPart = `Bossing ${fmtInt(bossKillsTotal)}/${fmtInt(ZAM_TARGET_BOSS_KC)}`;

  return `• **Zamorakian check:** ${ok ? "✅ matches qualified" : "⚠️ verify"} (${raidsPart} • ${bossPart} • needs ONE)`;
}

/** ✅ Proselyte → Colonel requirements (unique pets + collection log completed) */
const SPECIAL_REQ: Record<string, { pets: number; clog: number }> = {
  Proselyte: { pets: 2, clog: 700 },
  Major: { pets: 10, clog: 850 },
  Master: { pets: 15, clog: 1000 },
  Colonel: { pets: 25, clog: 1250 },
};

function specialPetsClogLine(
  requestedRoleLabel: string,
  petsUnique: number | null | undefined,
  collectionLogCompleted: number | null | undefined
) {
  const req = SPECIAL_REQ[requestedRoleLabel];
  if (!req) return null;

  if (
    typeof petsUnique !== "number" ||
    !Number.isFinite(petsUnique) ||
    typeof collectionLogCompleted !== "number" ||
    !Number.isFinite(collectionLogCompleted)
  ) {
    return `• **${requestedRoleLabel} check:** ⚠️ verify (missing pets/clog)`;
  }

  const petsOk = petsUnique >= req.pets;
  const clogOk = collectionLogCompleted >= req.clog;
  const ok = petsOk && clogOk;

  return `• **${requestedRoleLabel} check:** ${ok ? "✅ matches qualified" : "⚠️ verify"} (Pets ${fmtInt(
    petsUnique
  )}/${fmtInt(req.pets)}, CLog ${fmtInt(collectionLogCompleted)}/${fmtInt(req.clog)})`;
}

/** ✅ FIX: only show item request check for item-point ranks (not skilling/special/zam) */
function isNonItemRankLabel(label: string) {
  return (
    label === "Zamorakian" ||
    Object.prototype.hasOwnProperty.call(SKILL_TOTAL_LEVEL_REQ, label) ||
    Object.prototype.hasOwnProperty.call(SPECIAL_REQ, label)
  );
}

export async function POST(req: Request) {
  // Parse + validate
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body.", details: e?.errors ?? String(e) },
      { status: 400 }
    );
  }

  // Prefer Discord ID from session if available; fall back to the provided one
  let sessionDiscordId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    sessionDiscordId = (session as any)?.discordId as string | undefined;
  } catch {
    // ignore
  }

  const requesterDiscordId = (sessionDiscordId || body.requesterDiscordId || "").trim();
  if (!requesterDiscordId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing requester Discord ID. (If Discord login isn't wired, you must enter it.)",
      },
      { status: 400 }
    );
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const staffChannelId = process.env.DISCORD_STAFF_CHANNEL_ID;
  if (!botToken || !staffChannelId) {
    return NextResponse.json(
      { ok: false, error: "Missing DISCORD_BOT_TOKEN or DISCORD_STAFF_CHANNEL_ID env var." },
      { status: 500 }
    );
  }

  const {
    playerId,
    rsn,
    requestedRank,
    requestedRole,
    notes,
    itemPointsEarned,
    itemNextThreshold,
    itemQualifiedRankLabel,
    itemNextRankLabel,
    totalLevel,
    raidsTotal,
    bossKillsTotal,
    petsUnique,
    collectionLogCompleted,
  } = body;

  // 1) Insert request into DB
  const sb = supabaseAdmin();

  const insertRow: Record<string, any> = {
    player_id: playerId,
    rsn,
    requested_rank: requestedRank,
    requested_role: requestedRole,
    requester_discord_id: requesterDiscordId,
    notes: notes?.trim() ? notes.trim() : null,
    status: "pending",
  };

  const { data: inserted, error: insErr } = await sb
    .from("review_requests")
    .insert(insertRow)
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    return NextResponse.json(
      { ok: false, error: "Failed to create review request.", details: insErr?.message },
      { status: 500 }
    );
  }

  const requestId = String(inserted.id);

  // (Optional) update extras if you later add columns; ignore failures
  try {
    await sb
      .from("review_requests")
      .update({
        item_points_earned: typeof itemPointsEarned === "number" ? itemPointsEarned : null,
        item_next_threshold: typeof itemNextThreshold === "number" ? itemNextThreshold : null,
        item_qualified_rank_label: itemQualifiedRankLabel ?? null,
        item_next_rank_label: itemNextRankLabel ?? null,

        total_level: typeof totalLevel === "number" ? totalLevel : null,
        raids_total: typeof raidsTotal === "number" ? raidsTotal : null,
        boss_kills_total: typeof bossKillsTotal === "number" ? bossKillsTotal : null,
        pets_unique: typeof petsUnique === "number" ? petsUnique : null,
        collection_log_completed: typeof collectionLogCompleted === "number" ? collectionLogCompleted : null,
      })
      .eq("id", requestId);
  } catch {
    // ignore (columns might not exist yet)
  }

  // 2) Build staff message
  const pointsLine =
    typeof itemPointsEarned === "number"
      ? `• **Item points:** ${fmtInt(itemPointsEarned)} / ${
          itemNextThreshold != null ? fmtInt(itemNextThreshold) : "—"
        }`
      : `• **Item points:** —`;

  const qualifiedLine = itemQualifiedRankLabel
    ? `• **Item qualified:** ${itemQualifiedRankLabel}${
        itemNextRankLabel ? ` (Next: ${itemNextRankLabel})` : ""
      }`
    : null;

  // ✅ FIX: only show item request check when requestedRole is an item-point rank
  const itemCheckLine =
    itemQualifiedRankLabel && requestedRole && !isNonItemRankLabel(requestedRole)
      ? `• **Item request check:** ${
          requestedRole === itemQualifiedRankLabel ? "✅ matches qualified" : "⚠️ verify"
        }`
      : null;

  const skillLine = skillingCheckLine(requestedRole, totalLevel);
  const zamLine = zamorakianCheckLine(requestedRole, raidsTotal, bossKillsTotal);
  const specialLine = specialPetsClogLine(requestedRole, petsUnique, collectionLogCompleted);

  const petsLine =
    typeof petsUnique === "number" && Number.isFinite(petsUnique)
      ? `• **Unique pets:** ${fmtInt(petsUnique)}`
      : null;

  const clogLine =
    typeof collectionLogCompleted === "number" && Number.isFinite(collectionLogCompleted)
      ? `• **Collection log:** ${fmtInt(collectionLogCompleted)}`
      : null;

  const lines = [
    "📝 **Rank Up Review Request**",
    `• **RSN:** ${rsn}`,
    `• **Requested Role:** ${requestedRole}`,
    `• **Requester:** <@${requesterDiscordId}> (\`${requesterDiscordId}\`)`,
    `• **Total level:** ${totalLevel != null ? fmtInt(totalLevel) : "—"}`,
    pointsLine,
    qualifiedLine,
    itemCheckLine,
    petsLine,
    clogLine,
    skillLine,
    zamLine,
    specialLine,
    notes?.trim() ? `• **Notes:** ${notes.trim()}` : null,
    "",
    `Request ID: \`${requestId}\``,
  ].filter(Boolean);

  // 3) Post staff message with buttons
  let msgMeta: { messageId: string; channelId: string };
  try {
    msgMeta = await discordCreateMessageWithButtons({
      channelId: staffChannelId,
      botToken,
      content: lines.join("\n"),
      requestId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to post staff review message.", details: e?.message ?? String(e) },
      { status: 502 }
    );
  }

  // 4) Store message ids for later edits
  try {
    await sb
      .from("review_requests")
      .update({
        discord_channel_id: msgMeta.channelId,
        discord_message_id: msgMeta.messageId,
      })
      .eq("id", requestId);
  } catch {
    // ignore
  }

  // 5) Cleanup after successful staff submit
  try {
    await cleanupPlayer(sb, playerId);
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Submitted to staff, but failed to delete player data.",
        details: e?.message ?? String(e),
        requestId,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, requestId });
}
