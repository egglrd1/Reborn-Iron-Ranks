"use client";

import React, { useMemo, useState } from "react";

type SkillMetric = {
  level?: number | null;
  experience?: number | null;
};

type Props = {
  skills: Record<string, SkillMetric | null | undefined>;
  totalLevel?: number | null;
};

// OSRS skill tab order (now 25 skills incl. Sailing)
const SKILL_ORDER: { key: string; label: string }[] = [
  { key: "attack", label: "Attack" },
  { key: "strength", label: "Strength" },
  { key: "defence", label: "Defence" },

  { key: "hitpoints", label: "Hitpoints" },
  { key: "ranged", label: "Ranged" },
  { key: "prayer", label: "Prayer" },

  { key: "magic", label: "Magic" },
  { key: "cooking", label: "Cooking" },
  { key: "woodcutting", label: "Woodcutting" },

  { key: "fletching", label: "Fletching" },
  { key: "fishing", label: "Fishing" },
  { key: "firemaking", label: "Firemaking" },

  { key: "crafting", label: "Crafting" },
  { key: "smithing", label: "Smithing" },
  { key: "mining", label: "Mining" },

  { key: "herblore", label: "Herblore" },
  { key: "agility", label: "Agility" },
  { key: "thieving", label: "Thieving" },

  { key: "slayer", label: "Slayer" },
  { key: "farming", label: "Farming" },
  { key: "runecrafting", label: "Runecrafting" },

  { key: "hunter", label: "Hunter" },
  { key: "construction", label: "Construction" },

  // NEW
  { key: "sailing", label: "Sailing" },
];


function fmtInt(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString();
}

// OSRS XP table 1..99
function buildXpTable(maxLevel = 99) {
  const xp: number[] = new Array(maxLevel + 1).fill(0);
  let points = 0;
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    if (lvl === 1) {
      xp[lvl] = 0;
      continue;
    }
    const i = lvl - 1;
    points += Math.floor(i + 300 * Math.pow(2, i / 7));
    xp[lvl] = Math.floor(points / 4);
  }
  return xp;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Later you’ll replace these with real OSRS icons in /public/skills/<key>.png
function skillIconSrc(key: string) {
  return `/skills/${key}.png`;
}

export default function SkillsTab({ skills, totalLevel }: Props) {
  const XP = useMemo(() => buildXpTable(99), []);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const hover = hoverKey ? skills?.[hoverKey] ?? null : null;

  const hoverLevel = clamp(Number(hover?.level ?? 0) || 0, 0, 99);
  const hoverXp = Math.max(0, Number(hover?.experience ?? 0) || 0);

  const isMax = hoverLevel >= 99;
  const nextLevel = isMax ? null : hoverLevel + 1;
  const xpThis = hoverLevel >= 1 ? XP[hoverLevel] : 0;
  const xpNext = nextLevel != null ? XP[nextLevel] : null;
  const xpToNext = xpNext != null ? Math.max(0, xpNext - hoverXp) : null;

  const hoverLabel = hoverKey
    ? SKILL_ORDER.find((s) => s.key === hoverKey)?.label ?? hoverKey
    : null;

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 14,
        position: "relative",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Skills</div>

      {/* Inner “tab” */}
      <div
        style={{
          background: "rgba(0,0,0,0.28)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          padding: 12,
          position: "relative",
        }}
      >
        {/* Hover tooltip (OSRS-ish) */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            borderRadius: 10,
            padding: "8px 10px",
            background: "rgba(0,0,0,0.75)",
            border: "1px solid rgba(255,255,255,0.14)",
            opacity: hoverKey ? 1 : 0,
            transform: hoverKey ? "translateY(0px)" : "translateY(-6px)",
            transition: "opacity 140ms ease, transform 140ms ease",
            pointerEvents: "none",
          }}
        >
          {hoverKey ? (
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>{hoverLabel}</div>
                <div style={{ opacity: 0.95 }}>
                  Lvl <b>{hoverLevel || "—"}</b>
                </div>
              </div>

              <div style={{ opacity: 0.9, fontSize: 12 }}>
                XP: <b>{fmtInt(hoverXp)}</b>
                <span style={{ opacity: 0.6 }}> • </span>
                {isMax ? (
                  <b>MAX</b>
                ) : (
                  <>
                    To next: <b>{fmtInt(xpToNext)}</b>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* 3×8 icon grid */}
        <div
          style={{
            marginTop: 50, // room for tooltip
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            justifyItems: "center",
          }}
        >
          {SKILL_ORDER.map(({ key, label }) => {
            const m = skills?.[key] ?? null;
            const lvl = clamp(Number(m?.level ?? 0) || 0, 0, 99);

            return (
              <button
                key={key}
                type="button"
                onMouseEnter={() => setHoverKey(key)}
                onMouseLeave={() => setHoverKey((prev) => (prev === key ? null : prev))}
                onFocus={() => setHoverKey(key)}
                onBlur={() => setHoverKey((prev) => (prev === key ? null : prev))}
                title={label}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: hoverKey === key ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.22)",
                  padding: 6,
                  position: "relative",
                  cursor: "default",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <img
  src={skillIconSrc(key)}
  alt=""
  width={32}
  height={32}
  style={{
    imageRendering: "pixelated",
    opacity: 0.95,
  }}
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).src = "/skills/placeholder.png";
  }}
/>

                </div>

                {/* Level overlay (bottom-right) */}
                <div
                  style={{
                    position: "absolute",
                    right: 6,
                    bottom: 6,
                    fontFamily: "serif",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: "16px",
                    color: "white",
                    textShadow: "0 1px 0 rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.55)",
                    opacity: lvl ? 1 : 0.6,
                  }}
                >
                  {lvl ? lvl : "—"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Total level row */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: 0.95,
            fontWeight: 800,
          }}
        >
          <div>Total level</div>
          <div style={{ fontFamily: "serif", fontWeight: 900, fontSize: 18 }}>
            {totalLevel != null ? fmtInt(totalLevel) : "—"}
          </div>
        </div>
      </div>

      {/* Extra detail row (optional, keeps your “xp at level / xp for next” readout) */}
      {hoverKey ? (
        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
          {isMax ? (
            <>Max level achieved.</>
          ) : (
            <>
              XP at level {hoverLevel}: <b>{fmtInt(xpThis)}</b>
              <span style={{ opacity: 0.6 }}> • </span>
              XP for {nextLevel}: <b>{fmtInt(xpNext)}</b>
              <span style={{ opacity: 0.6 }}> • </span>
              Remaining: <b>{fmtInt(xpToNext)}</b>
            </>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
          Hover a skill to see XP + XP to next level.
        </div>
      )}
    </section>
  );
}
