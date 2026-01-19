"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RefreshTempleButton({ rsn }: { rsn: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={!rsn || loading}
      onClick={async () => {
        if (!rsn) return;
        setLoading(true);
        try {
          // Trigger the API once, then refresh the server page data
          await fetch(`/api/temple/collection-log?rsn=${encodeURIComponent(rsn)}`, {
            cache: "no-store",
          }).catch(() => {});
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        cursor: !rsn || loading ? "not-allowed" : "pointer",
        opacity: !rsn || loading ? 0.7 : 1,
        fontWeight: 800,
      }}
      title="Refetch Temple data"
    >
      {loading ? "Refreshing Temple..." : "Refresh Temple"}
    </button>
  );
}
