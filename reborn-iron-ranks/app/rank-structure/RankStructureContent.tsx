// app/calculator/[id]/rank-structure/RankStructureContent.tsx
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
    requirements: ["2+ unique pets", "Collection Log: 700+"],
  },
  {
    id: "major",
    label: "Major",
    requirements: ["10+ unique pets", "Collection Log: 850+"],
  },
  {
    id: "master",
    label: "Master",
    requirements: ["15+ unique pets", "Collection Log: 1,000+"],
  },
  {
    id: "colonel",
    label: "Colonel",
    requirements: ["25+ unique pets", "Collection Log: 1,250+"],
  },
  {
    id: "zamorakian",
    label: "Zamorakian",
    requirements: [
      "Choose ONE path:",
      "• Bossing KC: 35,000+ (excludes Raids, Wintertodt, Zalcano, GOTR, Hespori)",
      "• Raids KC: 3,000+ (CoX, CM CoX, ToB, HM ToB, ToA, Expert ToA)",
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

export default function RankStructureContent() {
  return (
    <main style={{ padding: 18, fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1.05 }}>Rank Structure</h1>
        <div style={{ opacity: 0.78, marginTop: 6, maxWidth: 980, fontSize: 13, lineHeight: 1.35 }}>
          <b>PvM</b> ranks come from the Item Checklist points. <b>Skilling</b> ranks auto-qualify from Wise Old Man total
          level. <b>Special</b> ranks are milestone requirements.
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 1100 }}>
        <Section title="PvM Ranks" subtitle="Point thresholds (base requirements still apply).">
          <Table3
            col1="Points"
            col2="Infernal"
            col3="Rank"
            rows={PVM_RANKS.map((r: any) => {
              const locked = isInfernalGatedRank(r.id);
              return {
                left: typeof r.thresholdPoints === "number" ? `${r.thresholdPoints.toLocaleString()}+` : "Base",
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
                    style={{ opacity: locked ? 0.6 : 1, filter: locked ? "grayscale(1)" : "none" }}
                  >
                    <RankCell id={r.id} label={r.label} />
                  </div>
                ),
              };
            })}
          />
        </Section>

        <Section title="Skilling Ranks" subtitle="Auto-qualified from WOM total level.">
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

        <Section title="Special Ranks" subtitle="Milestones (manual checks).">
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
                      <li key={idx} style={{ margin: "4px 0", lineHeight: 1.3 }}>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ opacity: 0.6, fontSize: 12, maxWidth: 1100, lineHeight: 1.35 }}>
          Heads up: icons must exist for each rank id in <b>public/ranks/</b> (or add a placeholder).
        </div>
      </div>
    </main>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 18 }}>{title}</div>
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
          gridTemplateColumns: "1fr 200px 240px",
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
            gridTemplateColumns: "1fr 200px 240px",
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
