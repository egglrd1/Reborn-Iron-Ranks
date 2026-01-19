// app/rank-structure/page.tsx
// Server Component (no event handlers). Rank icons live at: public/ranks/<rankId>.png

import React from "react";
import { PVM_RANKS } from "@/lib/reborn_rank_rules";
import RankCell from "@/components/RankCell";

// Skilling total-level thresholds
type SkillingRank = { id: string; label: string; totalLevelRequired: number };

const SKILLING_RANKS: SkillingRank[] = [
  { id: "emerald", label: "Emerald", totalLevelRequired: 1000 },
  { id: "onyx", label: "Onyx", totalLevelRequired: 1500 },
  { id: "zenyte", label: "Zenyte", totalLevelRequired: 2000 },
  { id: "maxed", label: "Maxed", totalLevelRequired: 2376 },
];

type SpecialRank = { id: string; label: string; requirements: string[] };

const SPECIAL_RANKS: SpecialRank[] = [
  {
    id: "proselyte",
    label: "Proselyte",
    requirements: ["Pet log: 2+ unique pets", "Collection log: 700+ items"],
  },
  {
    id: "major",
    label: "Major",
    requirements: ["Pet log: 10+ unique pets", "Collection log: 850+ items"],
  },
  {
    id: "master",
    label: "Master",
    requirements: ["Pet log: 15+ unique pets", "Collection log: 1000+ items"],
  },
  {
    id: "colonel",
    label: "Colonel",
    requirements: ["Pet log: 25+ unique pets", "Collection log: 1250+ items"],
  },
  {
    id: "zamorakian",
    label: "Zamorakian",
    requirements: [
      "Choose ONE path:",
      "• Bossing KC: 35,000+ (excludes Raids, Wintertodt, Zalcano, Guardians of the Rift, Hespori)",
      "• Raids KC: 3,000+ total from: Chambers of Xeric, Challenge Mode CoX, Theatre of Blood, Hard Mode ToB, Tombs of Amascut, Expert ToA",
      "No screenshots required",
    ],
  },
];

function getRankIconSrc(rankId: string) {
  return `/ranks/${rankId}.png`;
}

function isInfernalGatedRank(rankId: string) {
  return rankId === "gnome_child" || rankId === "wrath" || rankId === "beast";
}

function InfernalPill() {
  return (
    <span
      style={{
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 900,
        padding: "2px 8px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        opacity: 0.95,
        whiteSpace: "nowrap",
      }}
    >
      🔒 Infernal
    </span>
  );
}

export default function RankStructurePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ marginLeft: "auto", opacity: 0.8, fontWeight: 800 }}>
          Reborn Rank Calculator • Rank Structure
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>Rank Structure</h1>
        <div style={{ opacity: 0.75, marginTop: 6, maxWidth: 980 }}>
          PvM ranks are point-based from the item checklist. Skilling ranks are based on total level (Wise Old Man). Special
          ranks are milestone requirements.
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, maxWidth: 1100 }}>
        <Section title="PvM Ranks" subtitle="Point-based (base requirements required).">
          <Table3
            col1="Points Threshold"
            col2="Infernal Gate"
            col3="Rank"
            rows={PVM_RANKS.map((r: (typeof PVM_RANKS)[number]) => {
              const locked = isInfernalGatedRank(r.id);
              return {
                left: typeof r.thresholdPoints === "number" ? `${r.thresholdPoints.toLocaleString()}+` : "Base only",
                mid: locked ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span>Yes</span>
                    <InfernalPill />
                  </div>
                ) : r.requiresInfernal ? (
                  "Yes"
                ) : (
                  "No"
                ),
                right: (
                  <div
                    title={locked ? `${r.label} requires Infernal Cape` : undefined}
                    style={{
                      opacity: locked ? 0.6 : 1,
                      filter: locked ? "grayscale(1)" : "none",
                    }}
                  >
                    <RankCell id={r.id} label={r.label} />
                  </div>
                ),
              };
            })}
          />
        </Section>

        <Section title="Skilling Ranks" subtitle="Auto-qualified by WOM total level (overall.level).">
          <Table3
            col1="Total level"
            col2="—"
            col3="Rank"
            rows={SKILLING_RANKS.map((r) => ({
              left: `${r.totalLevelRequired.toLocaleString()}+`,
              mid: "",
              right: <RankCell id={r.id} label={r.label} />,
            }))}
          />
        </Section>

        <Section title="Special Ranks" subtitle="Milestones (manual thresholds for now).">
          <div style={{ display: "grid", gap: 10 }}>
            {SPECIAL_RANKS.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(0,0,0,0.22)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <img src={getRankIconSrc(r.id)} alt="" width={22} height={22} style={{ imageRendering: "pixelated" }} />
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{r.label}</div>
                </div>

                <div style={{ padding: "10px 12px" }}>
                  <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
                    {r.requirements.map((req, idx) => (
                      <li key={idx} style={{ margin: "4px 0" }}>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ opacity: 0.65, fontSize: 12, maxWidth: 1100 }}>
          Note: this page is a Server Component; it won’t run client-side image fallbacks. Ensure you have icons for every rank
          id used here in <b>public/ranks/</b> (or add a placeholder for any missing ones).
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
      {subtitle ? <div style={{ opacity: 0.75, marginTop: 4, fontSize: 13 }}>{subtitle}</div> : null}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

function Table3({
  col1,
  col2,
  col3,
  rows,
}: {
  col1: string;
  col2: string;
  col3: string;
  rows: Array<{ left: React.ReactNode; mid: React.ReactNode; right: React.ReactNode }>;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 220px 220px",
          background: "rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          fontWeight: 900,
          letterSpacing: 0.4,
        }}
      >
        <div style={{ padding: "10px 12px", textAlign: "center" }}>{col1}</div>
        <div style={{ padding: "10px 12px", textAlign: "center" }}>{col2}</div>
        <div style={{ padding: "10px 12px", textAlign: "center" }}>{col3}</div>
      </div>

      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px 220px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            alignItems: "stretch",
          }}
        >
          <div style={{ padding: "10px 12px", fontSize: 18, textAlign: "center", fontFamily: "serif" }}>{r.left}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.85 }}>{r.mid}</div>
          <div style={{ padding: "10px 12px" }}>{r.right}</div>
        </div>
      ))}
    </div>
  );
}
