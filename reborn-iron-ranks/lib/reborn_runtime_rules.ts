// lib/reborn_runtime_rules.ts
import type { RuntimeConfig, RuntimeRequirement, RuntimeRankDef } from "./loadActiveConfig";

export type ChecklistState = Record<string, boolean>;

export type RankEval = {
  baseOk: boolean;
  baseMissing: string[];
  pointsEarned: number;
  pointsTargetMax: number;
  infernalChecked: boolean;

  qualifiedRank: RuntimeRankDef;
  nextRank: RuntimeRankDef | null;
};

function evalRequirement(req: RuntimeRequirement, checked: ChecklistState) {
  if (req.type === "allOf") {
    const missing = req.itemIds.filter((id) => !checked[id]);
    return { ok: missing.length === 0, missing };
  }

  const ok = req.itemIds.some((id) => !!checked[id]);
  const missing = ok ? [] : [...req.itemIds];
  return { ok, missing };
}

export function computePvmRankRuntime(checked: ChecklistState, cfg: RuntimeConfig): RankEval {
  const REQUIRED_REQUIREMENTS = cfg.itemPoints.requiredRequirements;
  const ITEMS = cfg.itemPoints.items;
  const PVM_RANKS = cfg.pvmRanks;

  // base req
  const baseMissing: string[] = [];
  for (const req of REQUIRED_REQUIREMENTS) {
    const r = evalRequirement(req, checked);
    if (!r.ok) baseMissing.push(...r.missing);
  }
  const baseOk = baseMissing.length === 0;

  // points
  let earned = 0;
  let max = 0;
  for (const it of ITEMS) {
    if (it.points == null) continue;
    max += it.points;
    if (checked[it.id]) earned += it.points;
  }

  // infernal checked
  const infernal = ITEMS.find((x) => (x.name || "").toLowerCase() === "infernal cape");
  const infernalChecked = infernal ? !!checked[infernal.id] : false;

  // highest achieved
  let qualified = PVM_RANKS[0] ?? { id: "bob", label: "Bob", requiresBase: true };

  for (const r of PVM_RANKS) {
    if (r.requiresBase && !baseOk) continue;
    if (typeof r.thresholdPoints === "number" && earned < r.thresholdPoints) continue;
    if (r.requiresInfernal && !infernalChecked) continue;
    qualified = r;
  }

  // next rank
  const idx = PVM_RANKS.findIndex((r) => r.id === qualified.id);
  const nextRank = idx >= 0 && idx < PVM_RANKS.length - 1 ? PVM_RANKS[idx + 1] : null;

  return {
    baseOk,
    baseMissing,
    pointsEarned: earned,
    pointsTargetMax: max,
    infernalChecked,
    qualifiedRank: qualified,
    nextRank,
  };
}