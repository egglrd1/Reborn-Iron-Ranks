// lib/reborn_skilling_rank_rules.ts

export type SkillingRankId = "unranked" | "emerald" | "onyx" | "zenyte" | "maxed";

export type SkillingRankDef = {
  id: SkillingRankId;
  label: string;
  totalLevelRequired: number;
};

export const SKILLING_RANKS: SkillingRankDef[] = [
  { id: "unranked", label: "Unranked", totalLevelRequired: 0 },
  { id: "emerald", label: "Emerald", totalLevelRequired: 1000 },
  { id: "onyx", label: "Onyx", totalLevelRequired: 1500 },
  { id: "zenyte", label: "Zenyte", totalLevelRequired: 2000 },
  { id: "maxed", label: "Maxed", totalLevelRequired: 2376 },
];

export function computeSkillingRankFromTotalLevel(totalLevel: number) {
  let qualified = SKILLING_RANKS[0];
  for (const r of SKILLING_RANKS) {
    if (totalLevel >= r.totalLevelRequired) qualified = r;
  }

  const idx = SKILLING_RANKS.findIndex((r) => r.id === qualified.id);
  const next = idx >= 0 && idx < SKILLING_RANKS.length - 1 ? SKILLING_RANKS[idx + 1] : null;

  return { qualified, next };
}
