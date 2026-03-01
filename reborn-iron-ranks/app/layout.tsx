// app/layout.tsx
import "./globals.css";
import Providers from "./providers";

import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, { auth: { persistSession: false } });
}

async function isAdmin(discordId: string) {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("admin_users")
    .select("discord_id")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  const discordId =
    session && (session as any).discordId ? String((session as any).discordId) : null;

  let showAdmin = false;
  if (discordId) showAdmin = await isAdmin(discordId);

  // Prefer NextAuth-provided name (does NOT rely on admin_users having a name column)
  const displayName =
    (session as any)?.user?.name ||
    (session as any)?.user?.username ||
    (session as any)?.user?.email ||
    "Unknown";

  return (
    <html lang="en">
      <body>
        <Providers>
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            {showAdmin ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href="/admin"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    fontWeight: 900,
                    textDecoration: "none",
                    color: "white",
                  }}
                >
                  Admin
                </Link>

                <div
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    background: "rgba(46,42,106,0.40)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    opacity: 0.95,
                  }}
                  title={discordId ? `Discord ID: ${discordId}` : undefined}
                >
                  ✅ Logged in as {String(displayName)}
                </div>
              </div>
            ) : null}
          </div>

          {children}
        </Providers>
      </body>
    </html>
  );
}