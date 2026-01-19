// app/players/page.tsx
// Server Component. Routes used:
// - Calculator: /calculator/[id]
// - Delete: client button calls DELETE /api/players/:id

import Link from "next/link";
import { headers } from "next/headers";
import DeletePlayerButton from "./DeletePlayerButton";
import IconImg from "@/app/components/IconImg";
import BackButton from "@/components/BackButton";

// ✅ global colors
import { UI } from "@/lib/uiColors";

type Player = {
  id: string;
  rsn: string;
  join_date: string | null;
  scaling: number | null;
};

async function getBaseUrlFromHeaders() {
  const h = await headers();

  // Prefer forwarded headers (Vercel), fall back to host
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";

  if (!host) return "";
  return `${proto}://${host}`;
}

async function getPlayers(): Promise<Player[]> {
  const base = await getBaseUrlFromHeaders();
  const url = base ? `${base}/api/players` : "/api/players";

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.players ?? [];
}

export default async function PlayersPage() {
  const players = await getPlayers();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: UI.bg,
        color: UI.text,
        fontFamily: "system-ui",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* TOPBAR (matches calculator) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          {/* On /players, fallback should be home */}
          <BackButton fallbackHref="/" />

          {/* Same pill + same crisp icon scaling as calculator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 10px",
              borderRadius: 14,
              border: `1px solid ${UI.border}`,
              background: UI.panel,
            }}
          >
            <IconImg
              src="/clan/icon.png"
              alt="Reborn Irons"
              size={34}
              style={{
                borderRadius: 10,
                background: UI.panelStrong,
                border: `1px solid ${UI.borderSoft}`,
                padding: 4,
              }}
            />

            <div style={{ display: "grid", lineHeight: 1.05 }}>
              <div
                style={{
                  fontWeight: 1000,
                  letterSpacing: 0.6,
                  fontSize: 13,
                  opacity: 0.95,
                }}
              >
                REBORN IRONS
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Rank Calculator</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Link
              href="/players/new"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: UI.red,
                border: `1px solid ${UI.redBorder}`,
                color: "white",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              + Add player
            </Link>
          </div>
        </div>

        {/* LIST */}
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${UI.border}`,
            background: UI.panel,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              background: UI.panelStrong,
              borderBottom: `1px solid ${UI.borderSoft}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 1000, letterSpacing: 0.3 }}>
              Players ({players.length})
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Open calculator or delete a player
            </div>
          </div>

          {players.length === 0 ? (
            <div style={{ padding: 14, opacity: 0.8 }}>No players yet.</div>
          ) : (
            <div style={{ display: "grid" }}>
              {players.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    alignItems: "center",
                    borderBottom: `1px solid ${UI.borderSoft}`,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.rsn}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 13 }}>
                      Player ID: <span style={{ opacity: 0.9 }}>{p.id}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Link
                      href={`/calculator/${encodeURIComponent(p.id)}`}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 12,
                        background: UI.red,
                        border: `1px solid ${UI.redBorder}`,
                        color: "white",
                        textDecoration: "none",
                        fontWeight: 1000,
                        whiteSpace: "nowrap",
                      }}
                      title="Go to calculator"
                    >
                      Calculator →
                    </Link>

                    <DeletePlayerButton id={p.id} rsn={p.rsn} className="delete" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          Delete calls <b>DELETE /api/players/:id</b> (Supabase) and refreshes the list.
        </div>
      </div>
    </main>
  );
}
