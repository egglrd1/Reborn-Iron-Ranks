// app/api/admin/review/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function isAdmin(discordId: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("admin_users")
    .select("discord_id")
    .eq("discord_id", discordId)
    .maybeSingle();
  return !!data;
}

async function assignDiscordRole(
  userDiscordId: string,
  roleLabel: string
) {
  const roleMap = JSON.parse(
    process.env.DISCORD_ROLE_MAP_JSON || "{}"
  );

  const roleId = roleMap[roleLabel];

  if (!roleId) return;

  await fetch(
    `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${userDiscordId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    }
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminDiscordId = (session as any).discordId as string;

  if (!(await isAdmin(adminDiscordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { requestId, action } = body;

  if (!requestId || !action) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: request } = await sb
    .from("review_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (action === "approve") {
    await assignDiscordRole(
      request.discord_id,
      request.requested_role
    );
  }

  // Log action
  await sb.from("admin_audit_log").insert({
    actor_discord_id: adminDiscordId,
    action: `review_${action}`,
    metadata: request,
  });

  // Remove request
  await sb.from("review_requests").delete().eq("id", requestId);

  return NextResponse.json({ ok: true });
}