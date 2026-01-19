"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  rsn: string;
  templeOk: boolean;
  templeStale: boolean;
  wikiOk: boolean;
  wikiStale: boolean;
  staleDays: number;
};

const LS_TEMPLE = "reborn_warn_temple_dismissed_v1";
const LS_WIKI = "reborn_warn_wikisync_dismissed_v1";

function Banner({
  title,
  body,
  storageKey,
}: {
  title: string;
  body: string;
  storageKey: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setDismissed(v === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (dismissed) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div style={{ fontSize: 18, lineHeight: "18px" }}>⚠️</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div style={{ opacity: 0.85, marginTop: 4 }}>{body}</div>
      </div>

      <button
        onClick={() => {
          try {
            localStorage.setItem(storageKey, "1");
          } catch {}
          setDismissed(true);
        }}
        style={{
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          borderRadius: 10,
          padding: "8px 10px",
          cursor: "pointer",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
        aria-label="Dismiss warning"
        title="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}

export default function SyncWarnings({
  rsn,
  templeOk,
  templeStale,
  wikiOk,
  wikiStale,
  staleDays,
}: Props) {
  const showTemple = useMemo(
    () => !!rsn && (!templeOk || templeStale),
    [rsn, templeOk, templeStale]
  );
  const showWiki = useMemo(
    () => !!rsn && (!wikiOk || wikiStale),
    [rsn, wikiOk, wikiStale]
  );

  if (!showTemple && !showWiki) return null;

  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      {showTemple ? (
        <Banner
          storageKey={LS_TEMPLE}
          title="TempleOSRS not detected or out of date"
          body={`Enable TempleOSRS in RuneLite and refresh your Temple profile to auto-populate item progress. (Stale threshold: ${staleDays} days)`}
        />
      ) : null}

      {showWiki ? (
        <Banner
          storageKey={LS_WIKI}
          title="WikiSync not detected or out of date"
          body={`Enable WikiSync in RuneLite to automatically track pets and collection log progress. (Stale threshold: ${staleDays} days)`}
        />
      ) : null}
    </div>
  );
}

