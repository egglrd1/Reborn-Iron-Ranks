// app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

type Props = {
  children: ReactNode;
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const shell: React.CSSProperties = {
  padding: "24px 16px",
  fontFamily: "system-ui",
  maxWidth: 1280,
  margin: "0 auto",
};

const bar: React.CSSProperties = {
  position: "sticky",
  top: 12,
  zIndex: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(10,10,18,0.92)",
  backdropFilter: "blur(10px)",
};

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const mono: React.CSSProperties = { fontFamily: "ui-monospace", opacity: 0.9 };

export default async function AdminLayout({ children }: Props) {
  const session = await getServerSession(authOptions);

  // Not logged in
  if (!session || !(session as any).discordId) {
    redirect("/players");
  }

  const discordId = String((session as any).discordId);

  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("admin_users")
    .select("discord_id,name,role")
    .eq("discord_id", discordId)
    .maybeSingle();

  // Not in admin table (or query failed)
  if (error || !data) {
    redirect("/players");
  }

  const displayName = (data as any).name ? String((data as any).name) : "Unknown";
  const role = (data as any).role ? String((data as any).role) : "admin";

  return (
    <div style={shell}>
      <div style={bar}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 1000, fontSize: 14 }}>Admin Portal</div>
          <div style={chip} title="You are authenticated for admin routes">
            ✅ Logged in as <span style={{ opacity: 0.9 }}>{displayName}</span>
            <span style={{ opacity: 0.55 }}>•</span>
            <span style={{ opacity: 0.85 }}>{role}</span>
          </div>
        </div>

        <div style={{ ...chip, opacity: 0.85 }} title="Discord ID from session">
          <span style={{ opacity: 0.8 }}>Discord:</span> <span style={mono}>{discordId}</span>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}