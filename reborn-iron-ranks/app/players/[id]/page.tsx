"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Player = {
  id: string;
  rsn: string;
  join_date: string | null;
  scaling: number | null;
  discord_id: string | null;
  created_at?: string | null;
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  // d might be YYYY-MM-DD or timestamp; show first 10 chars if timestamp
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/players/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load player");
        setPlayer(json);
      } catch (e: any) {
        setErr(e?.message || "Failed to load player");
        setPlayer(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  async function onDelete() {
    if (!player) return;

    const ok = confirm(`Delete ${player.rsn}? This cannot be undone.`);
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/players/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      router.push("/players");
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/players" style={{ textDecoration: "none", color: "white", opacity: 0.85 }}>
          ← Back
        </Link>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            onClick={onDelete}
            disabled={deleting || loading || !player}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,60,60,0.10)",
              color: "white",
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>

          <Link
            href={`/players/${encodeURIComponent(id)}/edit`}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Edit
          </Link>

          <Link
            href={`/calculator/${encodeURIComponent(id)}`}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "#2e2a6a",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Go to calculator →
          </Link>
        </div>
      </div>

      {loading ? (
        <p style={{ opacity: 0.7, marginTop: 18 }}>Loading…</p>
      ) : err ? (
        <p style={{ marginTop: 18, color: "#ff6b6b" }}>{err}</p>
      ) : !player ? (
        <p style={{ opacity: 0.7, marginTop: 18 }}>Player not found.</p>
      ) : (
        <>
          <h1 style={{ fontSize: 38, marginTop: 18, marginBottom: 6 }}>
            {player.rsn}
          </h1>

          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              maxWidth: 680,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <Row label="Join date" value={formatDate(player.join_date)} />
              <Row label="Scaling" value={(player.scaling ?? 100).toString()} />
              <Row label="Discord ID" value={player.discord_id ?? "—"} />
              <Row label="Created" value={formatDate(player.created_at)} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={{ opacity: 0.75 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
