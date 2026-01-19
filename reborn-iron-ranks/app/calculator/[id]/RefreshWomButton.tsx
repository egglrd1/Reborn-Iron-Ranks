"use client";

import { useState } from "react";

export default function RefreshWomButton({ rsn }: { rsn: string }) {
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const clean = (rsn || "").trim();

    // If this triggers, the issue is upstream: player.rsn isn't being loaded/passed.
    if (!clean) {
      alert(
        "RefreshWomButton: rsn is empty.\n\nThis means the page is not passing a valid player.rsn into the button."
      );
      return;
    }

    setBusy(true);
    try {
      // Send rsn BOTH as query param and JSON body (cannot fail)
      const url = `/api/wom/update?rsn=${encodeURIComponent(clean)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsn: clean }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("WOM refresh failed:", json);
        alert(json?.error || "Failed to refresh WOM");
        return;
      }

      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={refresh}
      disabled={busy}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
        fontWeight: 700,
      }}
      title={`Refresh from WOM for: ${rsn || "(empty)"}`}
    >
      {busy ? "Refreshing…" : "Refresh from WOM"}
    </button>
  );
}
