"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePlayerButton({
  id,
  rsn,
}: {
  id: string;
  rsn: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const ok = confirm(`Delete player "${rsn}"?\n\nThis cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/players/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(json?.error || "Delete failed.");
        return;
      }

      // Refresh server component data
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Delete failed (network error).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      style={{
        padding: "9px 12px",
        borderRadius: 12,
        background: "rgba(198,40,40,0.14)",
        border: "1px solid rgba(198,40,40,0.55)",
        color: "white",
        fontWeight: 1000,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.65 : 1,
        whiteSpace: "nowrap",
      }}
      title="Delete player"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
