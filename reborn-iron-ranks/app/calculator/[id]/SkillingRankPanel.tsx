"use client";

import React, { useMemo } from "react";
import { computeSkillingRankFromTotalLevel } from "@/lib/reborn_skilling_rank_rules";

function rankIconSrc(rankId: string) {
  // Put rank icons here:
  // reborn-iron-ranks/public/ranks/<rankId>.png
  return `/ranks/${rankId}.png`;
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function SkillingRankPanel({ totalLevel }: { totalLevel: number | null }) {
  const evaled = useMemo(() => {
    if (typeof totalLevel !== "number" || !Number.isFinite(totalLevel)) return null;
    return computeSkillingRankFromTotalLevel(totalLevel);
  }, [totalLevel]);

  if (!evaled) {
    return (
      <div style={{ opacity: 0.75, fontSize: 12 }}>
        Skilling rank: <b>—</b> (no total level yet)
      </div>
    );
  }

  const { qualified, next } = evaled;

  const nextReq = next?.totalLevelRequired ?? null;
  const prevReq = qualified.totalLevelRequired;

  const progress =
    nextReq == null ? 1 : clamp01((totalLevel! - prevReq) / Math.max(1, nextReq - prevReq));

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src={rankIconSrc(qualified.id)}
          alt=""
          width={22}
          height={22}
          style={{ imageRendering: "pixelated" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/ranks/placeholder.png";
          }}
        />
        <div style={{ fontWeight: 900 }}>
          Skilling Rank: <span style={{ fontFamily: "serif" }}>{qualified.label}</span>
        </div>
        <div style={{ marginLeft: "auto", opacity: 0.85, fontWeight: 800 }}>
          Total: <span style={{ fontFamily: "serif" }}>{totalLevel!.toLocaleString()}</span>
        </div>
      </div>

      {nextReq != null ? (
        <>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Next: <b style={{ fontFamily: "serif" }}>{next!.label}</b> at{" "}
            <b style={{ fontFamily: "serif" }}>{nextReq.toLocaleString()}</b>
          </div>

          <div
            style={{
              marginTop: 8,
              height: 12,
              borderRadius: 999,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.10)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round(progress * 100)}%`,
                background: "rgba(26,255,0,0.85)",
                transition: "width 650ms ease",
              }}
            />
          </div>
        </>
      ) : (
        <div style={{ marginTop: 8, opacity: 0.85, fontWeight: 800 }}>Max skilling rank achieved</div>
      )}
    </div>
  );
}
