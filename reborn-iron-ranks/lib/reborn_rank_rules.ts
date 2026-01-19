// lib/reborn_rank_rules.ts

import { ITEM_BY_ID, REQUIRED_REQUIREMENTS, type Requirement } from "./reborn_item_points";

export type RankId =
  | "bob"
  | "hellcat"
  | "imp"
  | "goblin"
  | "skulled"
  | "soul"
  | "gnome_child"
  | "wrath"
  | "beast";

export type RankDef = {
  id: RankId;
  label: string;
  thresholdPoints?: number;   // point rank only
  requiresBase: boolean;      // all pvm ranks require base
  requiresInfernal?: boolean; // hard gate
};

export const PVM_RANKS: RankDef[] = [
  { id: "bob", label: "Bob", requiresBase: true },
  { id: "hellcat", label: "Hellcat", requiresBase: true, thresholdPoints: 250 },
  { id: "imp", label: "Imp", requiresBase: true, thresholdPoints: 500 },
  { id: "goblin", label: "Goblin", requiresBase: true, thresholdPoints: 1000 },
  { id: "skulled", label: "Skulled", requiresBase: true, thresholdPoints: 1500 },
  { id: "soul", label: "Soul", requiresBase: true, thresholdPoints: 2000 },
  { id: "gnome_child", label: "Gnome Child", requiresBase: true, thresholdPoints: 2400, requiresInfernal: true },
  { id: "wrath", label: "Wrath", requiresBase: true, thresholdPoints: 2800, requiresInfernal: true },
  { id: "beast", label: "Beast", requiresBase: true, thresholdPoints: 3200, requiresInfernal: true },
];

export type ChecklistState = Record<string, boolean>; // itemId -> checked

export type RankEval = {
  baseOk: boolean;
  baseMissing: string[]; // itemIds
  pointsEarned: number;
  pointsTargetMax: number; // sum of all point items in dataset
  infernalChecked: boolean;

  qualifiedRank: RankDef;     // best rank achieved
  nextRank: RankDef | null;   // next target
};

function evalRequirement(req: Requirement, checked: ChecklistState) {
  if (req.type === "allOf") {
    const missing = req.itemIds.filter((id) => !checked[id]);
    return { ok: missing.length === 0, missing };
  }
  // anyOf
  const ok = req.itemIds.some((id) => !!checked[id]);
  const missing = ok ? [] : [...req.itemIds];
  return { ok, missing };
}

export function computeBaseRequirement(checked: ChecklistState) {
  const missing: string[] = [];

  for (const req of REQUIRED_REQUIREMENTS) {
    const r = evalRequirement(req, checked);
    if (!r.ok) missing.push(...r.missing);
  }

  return { ok: missing.length === 0, missing };
}

export function computePoints(checked: ChecklistState) {
  let earned = 0;
  let max = 0;

  for (const [id, item] of Object.entries(ITEM_BY_ID)) {
    if (item.points == null) continue;
    max += item.points;
    if (checked[id]) earned += item.points;
  }

  return { earned, max };
}

export function computePvmRank(checked: ChecklistState): RankEval {
  const base = computeBaseRequirement(checked);

  const { earned, max } = computePoints(checked);

  const infernalId = Object.keys(ITEM_BY_ID).find((k) => ITEM_BY_ID[k].name.toLowerCase() === "infernal cape");
  const infernalChecked = infernalId ? !!checked[infernalId] : false;

  // Determine highest achieved
  let qualified = PVM_RANKS[0]; // Bob by default

  for (const r of PVM_RANKS) {
    // base required for all PvM ranks (including bob)
    if (r.requiresBase && !base.ok) continue;

    // point threshold
    if (typeof r.thresholdPoints === "number" && earned < r.thresholdPoints) continue;

    // infernal gate
    if (r.requiresInfernal && !infernalChecked) continue;

    qualified = r;
  }

  // Find next rank after qualified
  const idx = PVM_RANKS.findIndex((r) => r.id === qualified.id);
  const nextRank = idx >= 0 && idx < PVM_RANKS.length - 1 ? PVM_RANKS[idx + 1] : null;

  return {
    baseOk: base.ok,
    baseMissing: base.missing,
    pointsEarned: earned,
    pointsTargetMax: max,
    infernalChecked,
    qualifiedRank: qualified,
    nextRank,
  };
}

