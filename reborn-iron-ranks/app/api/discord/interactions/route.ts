// app/api/discord/interactions/route.ts
import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional: gives the function more breathing room for the follow-up work.
// (Does NOT affect Discord’s requirement that we respond quickly.)
export const maxDuration = 15;

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function json(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

// ✅ robust: verify using exact raw bytes (timestamp bytes + body bytes)
function verifyDiscordSignature(opts: {
  publicKey: string;
  signature: string;
  timestamp: string;
  bodyBytes: Uint8Array;
}) {
  const publicKey = (opts.publicKey || "").trim();
  const signature = (opts.signature || "").trim();
  const timestamp = (opts.timestamp || "").trim();
  const bodyBytes = opts.bodyBytes;

  const sig = Buffer.from(signature, "hex");
  const pk = Buffer.from(publicKey, "hex");

  const enc = new TextEncoder();
  const tsBytes = enc.encode(timestamp);

  const msg = new Uint8Array(tsBytes.length + bodyBytes.length);
  msg.set(tsBytes, 0);
  msg.set(bodyBytes, tsBytes.length);

  return nacl.sign.detached.verify(msg, sig, pk);
}

async function discordAddRole(args: {
  botToken: string;
  guildId: string;
  userId: string;
  roleId: string;
}) {
  const { botToken, guildId, userId, roleId } = args;

  const r = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT", headers: { Authorization: `Bot ${botToken}` } }
  );

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Add role failed: ${r.status} ${t}`);
  }
}

function getRoleIdFromLabel(label: string): string | null {
  const raw = process.env.DISCORD_ROLE_MAP_JSON;
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[label] ?? null;
  } catch {
    return null;
  }
}

async function postInteractionFollowupEphemeral(args: {
  applicationId: string;
  interactionToken: string;
  content: string;
}) {
  const { applicationId, interactionToken, content } = args;

  // Follow-up message (ephemeral) via interaction webhook
  await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      flags: 64,
    }),
  }).catch(() => {});
}

async function disableButtonsOnStaffMessage(args: {
  botToken: string;
  channelId: string;
  messageId: string;
  newContent?: string;
}) {
  const { botToken, channelId, messageId, newContent } = args;

  const payload: any = {
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Approve", custom_id: "disabled", disabled: true },
          { type: 2, style: 4, label: "Deny", custom_id: "disabled2", disabled: true },
        ],
      },
    ],
  };
  if (newContent) payload.content = newContent;

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function disabledInteractionComponents() {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Approve", custom_id: "disabled", disabled: true },
        { type: 2, style: 4, label: "Deny", custom_id: "disabled2", disabled: true },
      ],
    },
  ];
}

async function handleDecision(interaction: any) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    console.log("[discord/interactions] missing botToken or guildId");
    return;
  }

  const customId: string = interaction?.data?.custom_id ?? "";
  const parts = customId.split(":");
  if (parts.length !== 3 || parts[0] !== "review") {
    console.log("[discord/interactions] unknown custom_id:", customId);
    return;
  }

  const action = parts[1];
  const requestId = parts[2];

  const applicationId = String(interaction?.application_id ?? "");
  const interactionToken = String(interaction?.token ?? "");
  const clickedBy = String(interaction?.member?.user?.id ?? interaction?.user?.id ?? "");

  console.log("[discord/interactions] decision:", { action, requestId, clickedBy });

  const sb = supabaseAdmin();

  const { data: rr, error } = await sb
    .from("review_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !rr) {
    console.log("[discord/interactions] request not found:", requestId, error?.message);
    if (applicationId && interactionToken) {
      await postInteractionFollowupEphemeral({
        applicationId,
        interactionToken,
        content: "Request not found.",
      });
    }
    return;
  }

  if (rr.status && rr.status !== "pending") {
    console.log("[discord/interactions] already decided:", rr.status);
    if (applicationId && interactionToken) {
      await postInteractionFollowupEphemeral({
        applicationId,
        interactionToken,
        content: `Already ${rr.status}.`,
      });
    }
    return;
  }

  const requesterDiscordId: string = rr.requester_discord_id;
  const requestedRoleLabel: string = rr.requested_role;

  const approved = action === "approve";
  const denied = action === "deny";
  if (!approved && !denied) return;

  const roleId = getRoleIdFromLabel(requestedRoleLabel);
  if (!roleId) {
    console.log("[discord/interactions] missing role mapping for:", requestedRoleLabel);
    if (applicationId && interactionToken) {
      await postInteractionFollowupEphemeral({
        applicationId,
        interactionToken,
        content: `No role mapping found for "${requestedRoleLabel}". Add it to DISCORD_ROLE_MAP_JSON.`,
      });
    }
    return;
  }

  try {
    if (approved) {
      await discordAddRole({ botToken, guildId, userId: requesterDiscordId, roleId });
      console.log("[discord/interactions] role added:", { requesterDiscordId, roleId });
    } else {
      console.log("[discord/interactions] denied; no role change");
    }

    await sb
      .from("review_requests")
      .update({
        status: approved ? "approved" : "denied",
        decision: approved ? "approved" : "denied",
        decided_at: new Date().toISOString(),
        decided_by_discord_id: clickedBy,
      })
      .eq("id", requestId);

    // Best-effort: also disable buttons via PATCH (in case message wasn’t the one Discord updated)
    if (rr.discord_channel_id && rr.discord_message_id) {
      await disableButtonsOnStaffMessage({
        botToken,
        channelId: rr.discord_channel_id,
        messageId: rr.discord_message_id,
      });
    }

    if (applicationId && interactionToken) {
      await postInteractionFollowupEphemeral({
        applicationId,
        interactionToken,
        content: approved
          ? `✅ Approved. Added **${requestedRoleLabel}** to <@${requesterDiscordId}>.`
          : `❌ Denied.`,
      });
    }
  } catch (e: any) {
    console.log("[discord/interactions] ERROR:", e?.message ?? e);
    if (applicationId && interactionToken) {
      await postInteractionFollowupEphemeral({
        applicationId,
        interactionToken,
        content: `Failed: ${e?.message ?? String(e)}`,
      });
    }
  }
}

export async function POST(req: Request) {
  const started = Date.now();

  try {
    console.log("[discord/interactions] HIT", new Date().toISOString());

    const publicKey = (process.env.DISCORD_PUBLIC_KEY || "").trim();
    if (!publicKey) {
      console.log("[discord/interactions] Missing DISCORD_PUBLIC_KEY");
      return json({ error: "Missing DISCORD_PUBLIC_KEY" }, 500);
    }

    const sig = (req.headers.get("x-signature-ed25519") || "").trim();
    const ts = (req.headers.get("x-signature-timestamp") || "").trim();

    if (!sig || !ts) {
      console.log("[discord/interactions] Missing signature headers");
      return json({ error: "Missing Discord signature headers" }, 401);
    }

    const bodyBuf = new Uint8Array(await req.arrayBuffer());

    const ok = verifyDiscordSignature({
      publicKey,
      signature: sig,
      timestamp: ts,
      bodyBytes: bodyBuf,
    });

    console.log("[discord/interactions] signature ok?", ok, "ms:", Date.now() - started);
    if (!ok) return json({ error: "Invalid signature" }, 401);

    const rawBody = new TextDecoder().decode(bodyBuf);
    const interaction = JSON.parse(rawBody);
    const type = interaction?.type;

    // PING verification
    if (type === 1) {
      console.log("[discord/interactions] PING OK");
      return json({ type: 1 });
    }

    // Button clicks
    if (type === 3) {
      // ✅ Run the work reliably after response (prevents the “only completes on later requests” issue)
      after(() => handleDecision(interaction));

      // ✅ Instant UI update: disable buttons immediately in Discord without waiting on PATCH/Supabase/role calls
      console.log("[discord/interactions] UPDATE_MESSAGE type=7 (disable buttons) in ms:", Date.now() - started);
      return json({
        type: 7,
        data: {
          components: disabledInteractionComponents(),
        },
      });
    }

    console.log("[discord/interactions] Unsupported type:", type);
    return json({
      type: 4,
      data: { content: "Unsupported interaction type.", flags: 64 },
    });
  } catch (e: any) {
    console.log("[discord/interactions] POST handler crashed:", e?.message ?? e);
    return json({
      type: 4,
      data: { content: "Server error handling interaction.", flags: 64 },
    });
  }
}
