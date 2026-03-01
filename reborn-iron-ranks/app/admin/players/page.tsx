// app/admin/players/page.tsx
"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";

export default function AdminPlayersPage() {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function call(action: string, extra?: any) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(extra ?? {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Request failed");
      return json;
    } catch (e: any) {
      setMsg(e?.message || "Request failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const json = await call("stats");
    if (json?.ok) setCount(json.count ?? 0);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <BackButton fallbackHref="/admin" />
      <h1 style={{ fontSize: 28, marginTop: 12 }}>Player Management</h1>

      <div style={{ opacity: 0.85, marginTop: 6 }}>
        Current /players rows: <b>{count == null ? "—" : count}</b>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <button
          disabled={busy}
          onClick={refresh}
          style={btn("rgba(255,255,255,0.08)")}
        >
          Refresh count
        </button>

        <button
          disabled={busy}
          onClick={async () => {
            const ok = confirm("Clear ALL players? This wipes /players immediately.");
            if (!ok) return;
            const json = await call("clear_all");
            if (json?.ok) {
              setMsg("✅ Cleared all /players rows.");
              refresh();
            }
          }}
          style={btn("rgba(255,0,0,0.25)")}
        >
          Clear /players (ALL)
        </button>

        <button
          disabled={busy}
          onClick={async () => {
            const json = await call("clear_stale", { hours: 2 });
            if (json?.ok) {
              setMsg(`✅ Deleted ${json.deleted ?? 0} stale rows (older than 2h).`);
              refresh();
            }
          }}
          style={btn("rgba(0,200,255,0.18)")}
          title="Deletes player_profiles rows where created_at is older than 2 hours"
        >
          Clear stale (2h)
        </button>
      </div>

      {msg ? (
        <div style={{ marginTop: 14, opacity: 0.9 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ marginTop: 18, opacity: 0.7, fontSize: 12, lineHeight: 1.35 }}>
        Note: “Clear stale (2h)” requires <b>player_profiles.created_at</b> (timestamptz default now()).
      </div>
    </main>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    background: bg,
    border: "1px solid rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  };
}