// app/calculator/[id]/page.tsx
import React from "react";
import RefreshWomButton from "./RefreshWomButton";
import SyncWarnings from "./SyncWarnings";
import SkillsTab from "./SkillsTab";
import ItemChecklist from "./ItemChecklist";
import SkillingRankPanel from "./SkillingRankPanel";
import BackButton from "@/components/BackButton";

// ✅ correct location in your repo
import IconImg from "@/app/components/IconImg";

// ✅ NEW
import SubmitForReviewButton from "./SubmitForReviewButton";

// ✅ NEW: build absolute base URL safely on Vercel/Next 16
import { headers } from "next/headers";

/* =========================
   Types & Fetchers
========================= */

type PlayerRow = {
  id: string;
  rsn: string;
};

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : "";
}

async function getPlayer(id: string): Promise<PlayerRow | null> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/players/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.player ?? json ?? null;
}

async function getWom(rsn: string) {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/wom/player?rsn=${encodeURIComponent(rsn)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

async function getTempleCollectionLog(rsn: string) {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/temple/collection-log?rsn=${encodeURIComponent(rsn)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

/* =========================
   Helpers
========================= */

function metricToKc(m: any): number {
  const n = Number(m?.kills ?? m?.score ?? m?.kc ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickMetric(wom: any, type: "skills" | "bosses", name: string) {
  return wom?.latestSnapshot?.data?.[type]?.[name] ?? null;
}

function fmtInt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString() : "—";
}

function fmt1(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(1) : "—";
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function titleCase(s: string) {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function prettyBossName(key: string) {
  const overrides: Record<string, string> = {
    chambers_of_xeric: "Chambers of Xeric",
    chambers_of_xeric_challenge_mode: "Challenge Mode Chambers of Xeric",
    theatre_of_blood: "Theatre of Blood",
    theatre_of_blood_hard_mode: "Hard Mode Theatre of Blood",
    tombs_of_amascut: "Tombs of Amascut",
    tombs_of_amascut_expert: "Expert Tombs of Amascut",
    guardians_of_the_rift: "Guardians of the Rift",
  };

  if (overrides[key]) return overrides[key];
  return titleCase(key.replace(/_/g, " "));
}

/* =========================
   Zamorakian rules
========================= */

const ZAM_TARGET_RAIDS = 3000;
const ZAM_TARGET_BOSS_KC = 35000;

const RAID_KEYS = new Set<string>([
  "chambers_of_xeric",
  "chambers_of_xeric_challenge_mode",
  "theatre_of_blood",
  "theatre_of_blood_hard_mode",
  "tombs_of_amascut",
  "tombs_of_amascut_expert",
]);

const ZAM_BOSS_EXCLUDE_KEYS = new Set<string>([
  "wintertodt",
  "zalcano",
  "hespori",
  "guardians_of_the_rift",
  "gotr",
]);

const ZAM_ACTIVITY_EXCLUDE_KEYS = new Set<string>([
  "guardians_of_the_rift",
  "guardians_of_the_rift_games",
  "gotr",
]);

/* =========================
   Styles
========================= */

const S = {
  page: {
    padding: 24,
    fontFamily: "system-ui",
  } as React.CSSProperties,

  topbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  } as React.CSSProperties,

  h1: {
    fontSize: 34,
    margin: "8px 0 14px 0",
    lineHeight: 1.05,
  } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "1.05fr 1.45fr 0.95fr",
    gap: 14,
    alignItems: "start",
  } as React.CSSProperties,

  col: {
    alignSelf: "start",
    display: "grid",
    gap: 12,
    minWidth: 0,
  } as React.CSSProperties,

  panelWrap: {
    alignSelf: "start",
    minWidth: 0,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    padding: 12,
    maxHeight: 1080,
    overflow: "auto",
  } as React.CSSProperties,
} as const;

/* =========================
   Page
========================= */

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(id);

  if (!player) {
    return (
      <main style={S.page}>
        <BackButton fallbackHref="/players" />
        <h1 style={{ marginTop: 12 }}>Calculator</h1>
        <p style={{ opacity: 0.8 }}>Player not found for id: {id}</p>
      </main>
    );
  }

  const rsn = player.rsn.trim();
  const wom = rsn ? await getWom(rsn) : null;

  const templeResp = rsn ? await getTempleCollectionLog(rsn) : null;
  const temple = templeResp?.temple ?? templeResp?.data ?? null;

  // Skills
  const overall = pickMetric(wom, "skills", "overall");
  const totalLevel = overall?.level ?? null;
  const overallXp = overall?.experience ?? null;

  const skillsTab = {
    attack: pickMetric(wom, "skills", "attack"),
    strength: pickMetric(wom, "skills", "strength"),
    defence: pickMetric(wom, "skills", "defence"),
    hitpoints: pickMetric(wom, "skills", "hitpoints"),
    ranged: pickMetric(wom, "skills", "ranged"),
    prayer: pickMetric(wom, "skills", "prayer"),
    magic: pickMetric(wom, "skills", "magic"),
    mining: pickMetric(wom, "skills", "mining"),
    agility: pickMetric(wom, "skills", "agility"),
    smithing: pickMetric(wom, "skills", "smithing"),
    herblore: pickMetric(wom, "skills", "herblore"),
    fishing: pickMetric(wom, "skills", "fishing"),
    thieving: pickMetric(wom, "skills", "thieving"),
    cooking: pickMetric(wom, "skills", "cooking"),
    crafting: pickMetric(wom, "skills", "crafting"),
    firemaking: pickMetric(wom, "skills", "firemaking"),
    fletching: pickMetric(wom, "skills", "fletching"),
    woodcutting: pickMetric(wom, "skills", "woodcutting"),
    runecrafting: pickMetric(wom, "skills", "runecrafting"),
    slayer: pickMetric(wom, "skills", "slayer"),
    farming: pickMetric(wom, "skills", "farming"),
    construction: pickMetric(wom, "skills", "construction"),
    hunter: pickMetric(wom, "skills", "hunter"),
    sailing: pickMetric(wom, "skills", "sailing"),
  };

  // PvM totals
  const bosses = wom?.latestSnapshot?.data?.bosses ?? {};
  const activities = wom?.latestSnapshot?.data?.activities ?? {};

  let raidsTotal = 0;
  let bossKillsTotal = 0;

  let highestRaid = { key: "", name: "—", kc: 0 };
  let highestBoss = { key: "", name: "—", kc: 0 };

  for (const [key, metric] of Object.entries(bosses)) {
    const kc = metricToKc(metric);

    if (RAID_KEYS.has(key)) {
      raidsTotal += kc;
      if (kc > highestRaid.kc) highestRaid = { key, name: prettyBossName(key), kc };
      continue;
    }

    if (ZAM_BOSS_EXCLUDE_KEYS.has(key)) continue;

    bossKillsTotal += kc;
    if (kc > highestBoss.kc) highestBoss = { key, name: prettyBossName(key), kc };
  }

  const gotrActivityKc = (() => {
    for (const [k, m] of Object.entries(activities)) {
      if (!ZAM_ACTIVITY_EXCLUDE_KEYS.has(k)) continue;
      const kc = metricToKc(m);
      if (kc > 0) return kc;
    }
    return 0;
  })();

  // Temple summary
  const collected =
    temple?.total_collections_in_response ??
    temple?.total_collections_found ??
    temple?.total_collections ??
    null;
  const available = temple?.total_collections_available ?? null;
  const collectionLog = collected != null && available != null ? `${collected}/${available}` : "—";

  const raidsProgress = clamp01(raidsTotal / ZAM_TARGET_RAIDS);
  const bossProgress = clamp01(bossKillsTotal / ZAM_TARGET_BOSS_KC);

  const excludedLabel = `Excluding: Raids, Wintertodt, Zalcano, GOTR, Hespori`;

  // ✅ modal route for this calculator id
  const rankStructureHref = `/calculator/${encodeURIComponent(player.id)}/rank-structure`;

  return (
    <main style={S.page}>
      <div style={S.topbar}>
        <BackButton fallbackHref="/players" />

        {/* ✅ Reborn Irons Rank Calculator pill (LEFT side) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <IconImg src="/clan/icon.png" alt="Reborn Irons" size={32} style={{ borderRadius: 10 }} />
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>REBORN IRONS</div>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>Rank Calculator</div>
          </div>
        </div>

        {/* ✅ right side actions */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <SubmitForReviewButton playerId={player.id} rsn={rsn} requestedRank={"Manual review"} requestedRole={"Manual review"} />
          <RefreshWomButton rsn={rsn} />
        </div>
      </div>

      <SyncWarnings rsn={rsn} templeOk={!!temple} templeStale={false} wikiOk={false} wikiStale={true} staleDays={7} />

      <h1 style={S.h1}>{rsn || "—"}</h1>

      <div style={S.grid}>
        {/* LEFT COLUMN */}
        <div style={S.col}>
          <Card title="Summary">
            {!rsn ? (
              <Muted>RSN is missing.</Muted>
            ) : !wom ? (
              <Muted>Couldn’t load Wise Old Man data.</Muted>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                <Row label="Total level" value={fmtInt(totalLevel)} />
                <Row label="Overall XP" value={fmtInt(overallXp)} />
                <SkillingRankPanel totalLevel={typeof totalLevel === "number" ? totalLevel : null} />
                <Divider tight />

                <Row label="EHP" value={fmt1(wom?.ehp)} />
                <Row label="EHB" value={fmt1(wom?.ehb)} />
                <Row label="EHC" value={fmt1(temple?.ehc)} />

                <Divider tight />
                <Row label="Collection Log" value={collectionLog} />
              </div>
            )}
          </Card>

          <Card title="PvM">
            {!wom ? (
              <Muted>—</Muted>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Zamorakian Progress</div>

                  <Row
                    label="Raids KC"
                    value={`${raidsTotal.toLocaleString()} / ${ZAM_TARGET_RAIDS.toLocaleString()}`}
                  />
                  <ProgressBar value={raidsProgress} />

                  <Row
                    label="Bossing KC"
                    value={`${bossKillsTotal.toLocaleString()} / ${ZAM_TARGET_BOSS_KC.toLocaleString()}`}
                  />
                  <ProgressBar value={bossProgress} />

                  <div style={{ fontSize: 11, opacity: 0.72, lineHeight: 1.2 }}>
                    {excludedLabel}
                    {gotrActivityKc > 0 ? (
                      <span style={{ opacity: 0.85 }}> (GOTR activity seen: {gotrActivityKc.toLocaleString()})</span>
                    ) : null}
                  </div>

                  <Divider tight />
                </div>

                <Row label="Total raids" value={raidsTotal.toLocaleString()} />
                <Row
                  label="Highest raid"
                  value={
                    highestRaid.kc > 0 ? `${highestRaid.name} (${highestRaid.kc.toLocaleString()})` : "—"
                  }
                />

                <Divider tight />

                <Row label="Total boss kills" value={bossKillsTotal.toLocaleString()} />
                <Row
                  label="Highest boss"
                  value={
                    highestBoss.kc > 0 ? `${highestBoss.name} (${highestBoss.kc.toLocaleString()})` : "—"
                  }
                />
              </div>
            )}
          </Card>
        </div>

        {/* MIDDLE COLUMN */}
        <div style={S.panelWrap}>
          <ItemChecklist
            playerId={player.id}
            rsn={rsn}
            templeResp={templeResp}
            templeUpdatedMs={null}
            rankStructureHref={rankStructureHref}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div style={S.panelWrap}>
          <SkillsTab skills={skillsTab} totalLevel={totalLevel} />
        </div>
      </div>

      <details style={{ marginTop: 14, opacity: 0.9 }}>
        <summary style={{ cursor: "pointer" }}>Debug: WOM + Temple JSON</summary>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify({ wom, templeResp }, null, 2)}</pre>
      </details>
    </main>
  );
}

/* =========================
   Compact UI Bits
========================= */

function Card({ title, children }: { title: React.ReactNode; children: any }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 14 }}>{title}</div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "baseline",
        lineHeight: 1.15,
        fontSize: 13,
      }}
    >
      <div style={{ opacity: 0.78, minWidth: 0 }}>{label}</div>
      <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.10)",
        overflow: "hidden",
      }}
      aria-label={`Progress ${pct}%`}
      title={`${pct}%`}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "rgba(26,255,0,0.85)",
          transition: "width 450ms ease",
        }}
      />
    </div>
  );
}

function Divider({ tight }: { tight?: boolean }) {
  return (
    <div
      style={{
        height: 1,
        background: "rgba(255,255,255,0.10)",
        margin: tight ? "6px 0" : "10px 0",
      }}
    />
  );
}

function Muted({ children }: { children: any }) {
  return <div style={{ opacity: 0.75, fontSize: 12 }}>{children}</div>;
}
