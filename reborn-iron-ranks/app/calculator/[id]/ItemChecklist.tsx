"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ITEMS, type ItemDef } from "@/lib/reborn_item_points";
import { computePvmRank } from "@/lib/reborn_rank_rules";

function rankIconSrc(rankId: string) {
  return `/ranks/${rankId}.png`;
}

function isInfernalGatedRank(rankId: string) {
  // these are the 3 infernal-gated ranks in your rules
  return rankId === "gnome_child" || rankId === "wrath" || rankId === "beast";
}

function lockReasonText(rankLabel: string) {
  return `${rankLabel} requires Infernal Cape`;
}

type Props = {
  playerId: string;
  rsn: string;
  templeResp?: any;
  templeUpdatedMs?: number | null;

  // used to open modal route (.(rank-structure))
  rankStructureHref?: string;
};

type CheckedMap = Record<string, boolean>;

function lsKey(playerId: string) {
  return `reborn_item_checklist_v1_${playerId}`;
}

function lsTempleAppliedStampKey(playerId: string) {
  // bump version so everyone re-applies after this fix
  return `reborn_temple_applied_stamp_v4_${playerId}`;
}

function groupItems(items: ItemDef[]) {
  const map = new Map<string, ItemDef[]>();
  for (const it of items) {
    const g = it.group ?? "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(it);
  }
  return [...map.entries()];
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function normalizeName(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/\(f\)/g, "")
    .replace(/\(u\)/g, "u")
    .replace(/\(uncharged\)/g, "uncharged")
    .replace(/\(inactive\)/g, "inactive")
    .replace(/\(active\)/g, "active")
    .replace(/\(broken\)/g, "broken")
    .replace(/\(damaged\)/g, "damaged")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Pull item names out of Temple payload.
 * Your API route returns: { ok: true, temple: <payload> }
 */
function extractTempleItemNames(resp: any): string[] {
  const out: string[] = [];

  const temple = resp?.temple ?? resp;
  const data = temple?.data ?? temple;

  const push = (name: any) => {
    if (typeof name === "string" && name.trim()) out.push(name.trim());
  };

  const itemsTop = data?.items ?? null;

  const walk = (node: any, depth = 0) => {
    if (!node || depth > 7) return;

    if (Array.isArray(node)) {
      for (const v of node) walk(v, depth + 1);
      return;
    }

    if (typeof node === "object") {
      const name =
        (node as any)?.name ??
        (node as any)?.item_name ??
        (node as any)?.itemName ??
        (node as any)?.title ??
        null;

      const count =
        (node as any)?.count ??
        (node as any)?.quantity ??
        (node as any)?.qty ??
        (node as any)?.obtained ??
        (node as any)?.owned ??
        null;

      if (typeof name === "string") {
        if (count === false) {
          // skip
        } else if (typeof count === "number" && count <= 0) {
          // skip
        } else if (typeof count === "string" && count.trim() === "0") {
          // skip
        } else {
          push(name);
        }
      }

      for (const v of Object.values(node)) walk(v, depth + 1);
    }
  };

  walk(itemsTop);
  walk(data);

  return [...new Set(out)];
}

function buildLookup() {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();

  // For fuzzy fallback: keep normalized -> {id, rawName}
  const normEntries: Array<{ id: string; norm: string; raw: string }> = [];

  for (const it of ITEMS) {
    byId.set(it.id, it.id);
    byName.set(normalizeName(it.name), it.id);
    byName.set(normalizeName(it.name.replace(/\*+/g, "").trim()), it.id);
    normEntries.push({ id: it.id, norm: normalizeName(it.name), raw: it.name });
  }

  const findId = (needle: string) => {
    if (!needle) return null;
    const n = normalizeName(needle);
    return byId.get(needle) ?? byName.get(n) ?? null;
  };

  /**
   * Try multiple labels; if still not found, do a SAFE fuzzy contains match:
   * - if exactly 1 item contains all tokens, accept it.
   */
  const findIdAny = (needles: string[]) => {
    for (const s of needles) {
      const id = findId(s);
      if (id) return id;
    }

    // fuzzy fallback
    const best = fuzzyFindOne(needles);
    return best;
  };

  const fuzzyFindOne = (needles: string[]) => {
    // Turn candidate strings into token sets
    const tokenSets = needles
      .map((s) => normalizeName(s))
      .filter(Boolean)
      .map((s) => s.split(" ").filter(Boolean));

    if (!tokenSets.length) return null;

    // Score entries by how many tokenSets they fully contain
    const matches: string[] = [];
    for (const e of normEntries) {
      for (const tokens of tokenSets) {
        const ok = tokens.every((t) => e.norm.includes(t));
        if (ok) {
          matches.push(e.id);
          break;
        }
      }
    }

    // Only accept if unambiguous
    const uniq = [...new Set(matches)];
    return uniq.length === 1 ? uniq[0] : null;
  };

  return { findId, findIdAny };
}

function buildTempleCounts(names: string[]) {
  const counts = new Map<string, number>();
  for (const raw of names) {
    const key = normalizeName(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function resolveTempleToChecklistIds(
  templeNames: string[],
  lookup: {
    findId: (needle: string) => string | null;
    findIdAny: (needles: string[]) => string | null;
  }
) {
  const counts = buildTempleCounts(templeNames);

  const has = (name: string) => (counts.get(normalizeName(name)) ?? 0) > 0;

  const countAnyOf = (names: string[]) => {
    let total = 0;
    for (const n of names) total += counts.get(normalizeName(n)) ?? 0;
    return total;
  };

  // alias (Temple exact variants -> canonical-ish labels)
  const aliasToCanonical: Record<string, string> = {
    [normalizeName("Tumeken's shadow (uncharged)")]: "Tumeken's shadow",
    [normalizeName("Scythe of vitur (uncharged)")]: "Scythe of vitur",
    [normalizeName("Sanguinesti staff (uncharged)")]: "Sanguinesti staff",
    [normalizeName("Dizana's quiver (uncharged)")]: "Dizana's quiver",
    [normalizeName("Tonalztics of ralos (uncharged)")]: "Tonalztics of ralos",
    [normalizeName("Eye of ayak (uncharged)")]: "Eye of ayak",

    [normalizeName("Masori mask (f)")]: "Masori mask",
    [normalizeName("Masori body (f)")]: "Masori body",
    [normalizeName("Masori chaps (f)")]: "Masori chaps",

    [normalizeName("Craw's bow (u)")]: "Craw's bow",
    [normalizeName("Thammaron's sceptre (u)")]: "Thammaron's sceptre",
    [normalizeName("Viggora's chainmace (u)")]: "Viggora's chainmace",

    [normalizeName("Basilisk jaw")]: "Neitiznot faceguard",

    [normalizeName("Torva full helm (damaged)")]: "Torva full helm",
    [normalizeName("Torva platebody (damaged)")]: "Torva platebody",
    [normalizeName("Torva platelegs (damaged)")]: "Torva platelegs",
    [normalizeName("Torva full helm (broken)")]: "Torva full helm",
    [normalizeName("Torva platebody (broken)")]: "Torva platebody",
    [normalizeName("Torva platelegs (broken)")]: "Torva platelegs",

    [normalizeName("Serpentine visage")]: "Serpentine helm",

    [normalizeName("Trident of the seas (uncharged)")]: "Trident of the seas",
    [normalizeName("Trident of the seas (charged)")]: "Trident of the seas",
  };

  const partImplies: Array<{ part: string; targetCandidates: string[] }> = [
    { part: "Bandos hilt", targetCandidates: ["Bandos godsword", "Bandos Godsword"] },
    { part: "Saradomin hilt", targetCandidates: ["Saradomin godsword", "Saradomin Godsword"] },
    { part: "Zamorak hilt", targetCandidates: ["Zamorak godsword", "Zamorak Godsword"] },
    { part: "Armadyl hilt", targetCandidates: ["Armadyl godsword", "Armadyl Godsword"] },

    { part: "Harmonised orb", targetCandidates: ["Harmonised nightmare staff", "Harmonised staff"] },
    { part: "Eldritch orb", targetCandidates: ["Eldritch nightmare staff", "Eldritch staff"] },
    { part: "Volatile orb", targetCandidates: ["Volatile nightmare staff", "Volatile staff"] },

    { part: "Avernic defender hilt", targetCandidates: ["Avernic defender", "Avernic Defender"] },

    { part: "Hydra leather", targetCandidates: ["Ferocious gloves", "Ferocious Gloves"] },

    { part: "Tanzanite fang", targetCandidates: ["Toxic blowpipe", "Toxic Blowpipe"] },

    { part: "Ancient icon", targetCandidates: ["Ancient sceptre", "Ancient Sceptre"] },

    { part: "Serpentine visage", targetCandidates: ["Serpentine helm", "Serpentine Helm"] },
  ];

  const requiresAll: Array<{ parts: string[]; targetCandidates: string[] }> = [
    { parts: ["Nihil horn", "Armadyl crossbow"], targetCandidates: ["Zaryte crossbow", "Zaryte Crossbow"] },
    { parts: ["Kodai insignia", "Master wand"], targetCandidates: ["Kodai wand", "Kodai Wand"] },

    // Swamp
    { parts: ["Magic fang", "Trident of the seas"], targetCandidates: ["Trident of the swamp", "Trident of the Swamp"] },

    // Confliction
    {
      parts: ["Mokhaiotl cloth", "Tormented bracelet"],
      targetCandidates: ["Confliction gauntlets", "Confliction Gauntlets"],
    },

    // DHL
    { parts: ["Zamorakian hasta", "Hydra's claw"], targetCandidates: ["Dragon hunter lance", "Dragon Hunter Lance"] },

    // Bludgeon
    { parts: ["Bludgeon spine", "Bludgeon claw", "Bludgeon axon"], targetCandidates: ["Abyssal bludgeon", "Abyssal Bludgeon"] },

    // Voidwaker
    { parts: ["Voidwaker hilt", "Voidwaker blade", "Voidwaker gem"], targetCandidates: ["Voidwaker"] },

    { parts: ["Dragon boots", "Primordial crystal"], targetCandidates: ["Primordial boots", "Primordial Boots"] },
    { parts: ["Ranger boots", "Pegasian crystal"], targetCandidates: ["Pegasian boots", "Pegasian Boots"] },
    { parts: ["Infinity boots", "Eternal crystal"], targetCandidates: ["Eternal boots", "Eternal Boots"] },

    { parts: ["Araxyte fang", "Amulet of torture"], targetCandidates: ["Amulet of rancour", "Amulet of Rancour"] },

    { parts: ["Craw's bow (u)", "Fangs of venenatis"], targetCandidates: ["Webweaver bow", "Webweaver Bow"] },
    { parts: ["Thammaron's sceptre (u)", "Skull of vet'ion"], targetCandidates: ["Accursed sceptre", "Accursed Sceptre"] },
    { parts: ["Viggora's chainmace (u)", "Claws of callisto"], targetCandidates: ["Ursine chainmace", "Ursine Chainmace"] },

    {
      parts: ["Executioner's axe head", "Leviathan's lure", "Siren's staff", "Eye of the duke"],
      targetCandidates: ["Soulreaper axe", "Soulreaper Axe"],
    },

    { parts: ["Noxious point", "Noxious blade", "Noxious pommel"], targetCandidates: ["Noxious halberd", "Noxious Halberd"] },

    // DT2 rings
    { parts: ["Magus vestige", "Chromium ingot", "Seers ring"], targetCandidates: ["Magus ring", "Magus Ring"] },
    { parts: ["Venator vestige", "Chromium ingot", "Archers ring"], targetCandidates: ["Venator ring", "Venator Ring"] },
    { parts: ["Ultor vestige", "Chromium ingot", "Berserker ring"], targetCandidates: ["Ultor ring", "Ultor Ring"] },
    { parts: ["Bellator vestige", "Chromium ingot", "Warrior ring"], targetCandidates: ["Bellator ring", "Bellator Ring"] },
  ];

  const idsToCheck = new Set<string>();

  // A) direct/alias
  for (const raw of templeNames) {
    const n = normalizeName(raw);
    const canon = aliasToCanonical[n] ?? raw;

    const id = lookup.findId(canon) ?? lookup.findIdAny([canon]);
    if (id) idsToCheck.add(id);
  }

  // B) part implies
  for (const rule of partImplies) {
    if (!has(rule.part)) continue;
    const id = lookup.findIdAny(rule.targetCandidates);
    if (id) idsToCheck.add(id);
  }

  // C) composites
  for (const rule of requiresAll) {
    let ok = true;
    for (const p of rule.parts) {
      if (p === "Trident of the seas") {
        const present = has("Trident of the seas") || has("Trident of the seas (uncharged)") || has("Trident of the seas (charged)");
        if (!present) ok = false;
      } else {
        if (!has(p)) ok = false;
      }
      if (!ok) break;
    }
    if (!ok) continue;

    const id = lookup.findIdAny(rule.targetCandidates);
    if (id) idsToCheck.add(id);
  }

  // D) count-based rules (zenyte, synapse, venator shards, burning claws)
  if (countAnyOf(["Tormented synapse", "Tormented synapses"]) >= 3) {
    for (const t of ["Emberlight", "Purging staff", "Scorching bow"]) {
      const id = lookup.findIdAny([t, t[0].toUpperCase() + t.slice(1)]);
      if (id) idsToCheck.add(id);
    }
  }

  if (countAnyOf(["Venator shard", "Venator shards"]) >= 5) {
    const id = lookup.findIdAny(["Venator bow", "Venator Bow"]);
    if (id) idsToCheck.add(id);
  }

  if (countAnyOf(["Zenyte shard", "Zenyte shards"]) >= 4) {
    for (const t of ["Ring of suffering", "Amulet of torture", "Necklace of anguish", "Tormented bracelet"]) {
      const id = lookup.findIdAny([t, t.replace(/of /i, "of "), t[0].toUpperCase() + t.slice(1)]);
      if (id) idsToCheck.add(id);
    }
  }

  if (countAnyOf(["Burning claws"]) >= 2) {
    const id = lookup.findIdAny(["Burning claws", "Burning Claws"]);
    if (id) idsToCheck.add(id);
  }

  // IMPORTANT: Do NOT treat Enhanced Crystal Weapon Seed as owned for Bowfa/Blade.
  return [...idsToCheck];
}

export default function ItemChecklist({ playerId, rsn, templeResp, templeUpdatedMs, rankStructureHref }: Props) {
  const [checked, setChecked] = useState<CheckedMap>({});
  const [forceTempleRun, setForceTempleRun] = useState(0);

  const [templeDebug, setTempleDebug] = useState<{
    stamp: string;
    foundNames: number;
    sampleNames: string[];
    matchedIds: number;
    matchedSample: string[];
    note?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey(playerId));
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, [playerId]);

  useEffect(() => {
    try {
      localStorage.setItem(lsKey(playerId), JSON.stringify(checked));
    } catch {}
  }, [playerId, checked]);

  useEffect(() => {
    if (!rsn) return;

    const stamp = Number.isFinite(Number(templeUpdatedMs)) ? String(Number(templeUpdatedMs)) : "no-ts";

    if (!templeResp) {
      setTempleDebug({
        stamp,
        foundNames: 0,
        sampleNames: [],
        matchedIds: 0,
        matchedSample: [],
        note: "No templeResp was passed into ItemChecklist.",
      });
      return;
    }

    if (forceTempleRun === 0) {
      try {
        const lastApplied = localStorage.getItem(lsTempleAppliedStampKey(playerId));
        if (lastApplied === stamp) {
          setTempleDebug({
            stamp,
            foundNames: 0,
            sampleNames: [],
            matchedIds: 0,
            matchedSample: [],
            note: "Temple merge already applied for this templeUpdatedMs stamp (skipped). Click Re-run to force.",
          });
          return;
        }
      } catch {}
    }

    const names = extractTempleItemNames(templeResp);
    const lookup = buildLookup();
    const idsToCheck = resolveTempleToChecklistIds(names, lookup);

    const importantTargets = [
      "Trident of the swamp",
      "Trident of the seas",
      "Dragon hunter lance",
      "Venator bow",
      "Venator ring",
      "Bellator ring",
      "Ring of suffering",
      "Amulet of torture",
      "Necklace of anguish",
      "Tormented bracelet",
    ];

    const setIds = new Set(idsToCheck);
    const missingImportant = importantTargets.filter((t) => {
      const id = lookup.findIdAny([t, t.replace(/\bthe\b/i, "the")]);
      if (!id) return true;
      return !setIds.has(id);
    });

    setTempleDebug({
      stamp,
      foundNames: names.length,
      sampleNames: names.slice(0, 15),
      matchedIds: idsToCheck.length,
      matchedSample: idsToCheck.slice(0, 15).map((id) => ITEMS.find((x) => x.id === id)?.name ?? id),
      note:
        names.length === 0
          ? "Extractor found 0 item names in templeResp."
          : missingImportant.length
            ? `Still missing (likely naming mismatch in ITEMS): ${missingImportant.join(", ")}`
            : undefined,
    });

    if (idsToCheck.length) {
      setChecked((prev) => {
        const next = { ...prev };
        for (const id of idsToCheck) {
          if (next[id] === false) continue;
          next[id] = true;
        }
        return next;
      });
    }

    try {
      localStorage.setItem(lsTempleAppliedStampKey(playerId), stamp);
    } catch {}
  }, [playerId, rsn, templeResp, templeUpdatedMs, forceTempleRun]);

  const evaled = useMemo(() => computePvmRank(checked), [checked]);

  const next = evaled.nextRank;
  const nextThreshold = next && typeof next.thresholdPoints === "number" ? next.thresholdPoints : null;

  const nextIsLocked = !!next && isInfernalGatedRank(next.id) && !evaled.infernalChecked;
  const lockText = next ? lockReasonText(next.label) : "";

  const progressToNext = nextThreshold != null ? clamp01(evaled.pointsEarned / nextThreshold) : 1;

  const progressLabel =
    nextIsLocked
      ? `Infernal Cape required to advance • ${evaled.pointsEarned.toLocaleString()} / ${nextThreshold?.toLocaleString() ?? "—"} Points`
      : nextThreshold != null
        ? `${evaled.pointsEarned.toLocaleString()} / ${nextThreshold.toLocaleString()} Points`
        : `${evaled.pointsEarned.toLocaleString()} Points`;

  const groups = useMemo(() => groupItems(ITEMS), []);

  const qualifiedLocked = isInfernalGatedRank(evaled.qualifiedRank.id) && !evaled.infernalChecked;

  return (
    <section style={{ marginTop: 6 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 0.4 }}>Item Checklist</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(lsTempleAppliedStampKey(playerId));
              } catch {}
              setForceTempleRun((x) => x + 1);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
          Run Temple precheck
          </button>

          {/* View rank structure belongs here (purple pill) */}
          {rankStructureHref ? (
            <Link
              href={rankStructureHref}
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                background: "#2e2a6a",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                textDecoration: "none",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              View rank structure
            </Link>
          ) : null}
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
            <div style={{ position: "relative", width: 28, height: 28 }}>
              <img
                src={rankIconSrc(evaled.qualifiedRank.id)}
                alt=""
                width={28}
                height={28}
                title={qualifiedLocked ? lockReasonText(evaled.qualifiedRank.label) : undefined}
                style={{
                  imageRendering: "pixelated",
                  filter: qualifiedLocked ? "grayscale(1)" : "none",
                  opacity: qualifiedLocked ? 0.75 : 1,
                  display: "block",
                }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = "/ranks/placeholder.png";
                }}
              />
              {qualifiedLocked ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.65)",
                      border: "1px solid rgba(255,255,255,0.22)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      color: "white",
                      lineHeight: 1,
                      textShadow: "0 1px 0 rgba(0,0,0,0.85)",
                    }}
                  >
                    🔒
                  </span>
                </div>
              ) : null}
            </div>

            <div>
              Qualified: <span style={{ fontFamily: "serif" }}>{evaled.qualifiedRank.label}</span>
              {qualifiedLocked ? (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    opacity: 0.9,
                  }}
                  title={lockReasonText(evaled.qualifiedRank.label)}
                >
                  🔒 Infernal
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ opacity: 0.9 }}>
            {next ? (
              <div
                title={nextIsLocked ? lockText : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "flex-end",
                  opacity: nextIsLocked ? 0.6 : 1,
                  filter: nextIsLocked ? "grayscale(1)" : "none",
                }}
              >
                <span style={{ opacity: 0.85 }}>Next:</span>

                <div style={{ position: "relative", width: 22, height: 22 }}>
                  <img
                    src={rankIconSrc(next.id)}
                    alt=""
                    width={22}
                    height={22}
                    style={{ imageRendering: "pixelated", display: "block" }}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.onerror = null;
                      img.src = "/ranks/placeholder.png";
                    }}
                  />

                  {nextIsLocked ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          background: "rgba(0,0,0,0.65)",
                          border: "1px solid rgba(255,255,255,0.22)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          color: "white",
                          lineHeight: 1,
                          textShadow: "0 1px 0 rgba(0,0,0,0.85)",
                        }}
                      >
                        🔒
                      </span>
                    </div>
                  ) : null}
                </div>

                <b style={{ fontFamily: "serif" }}>{next.label}</b>

                {nextIsLocked ? <span style={{ marginLeft: 6, opacity: 0.95 }}>(Infernal Cape required)</span> : null}
              </div>
            ) : (
              <b>Max rank achieved</b>
            )}
          </div>
        </div>

        <div style={{ marginTop: 10, fontWeight: 800, opacity: 0.9 }}>{progressLabel}</div>

        <div
          style={{
            marginTop: 8,
            height: 14,
            borderRadius: 999,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(progressToNext * 100)}%`,
              background: nextIsLocked ? "rgba(255,255,255,0.22)" : "rgba(26,255,0,0.85)",
              transition: "width 650ms ease",
            }}
          />
        </div>

        <details style={{ marginTop: 10, opacity: 0.9 }}>
          <summary style={{ cursor: "pointer" }}>Temple precheck debug</summary>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
            <div>
              stamp: <b>{templeDebug?.stamp ?? "—"}</b>
            </div>
            <div>
              found names: <b>{templeDebug?.foundNames ?? 0}</b>
            </div>
            <div>
              matched checklist items: <b>{templeDebug?.matchedIds ?? 0}</b>
            </div>

            {templeDebug?.sampleNames?.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 800 }}>sample extracted names:</div>
                <div>{templeDebug.sampleNames.join(", ")}</div>
              </div>
            ) : null}
            {templeDebug?.matchedSample?.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 800 }}>sample matched checklist items:</div>
                <div>{templeDebug.matchedSample.join(", ")}</div>
              </div>
            ) : null}
            {templeDebug?.note ? (
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                note: <b>{templeDebug.note}</b>
              </div>
            ) : null}
          </div>
        </details>

        <div style={{ marginTop: 8, opacity: 0.65, fontSize: 12 }}>
          Temple prechecks: items/parts found on Temple will auto-check (and won’t overwrite anything you manually uncheck).
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {groups.map(([groupName, items]) => (
          <div
            key={groupName}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                fontWeight: 900,
                background: "rgba(0,0,0,0.25)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {groupName}
            </div>

            <div style={{ display: "grid" }}>
              {items.map((it) => {
                const isChecked = !!checked[it.id];
                const pts = it.points == null ? "—" : it.points.toLocaleString();

                return (
                  <label
                    key={it.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr 110px 90px",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setChecked((prev) => ({ ...prev, [it.id]: v }));
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        accentColor: "#1aff00",
                        justifySelf: "center",
                      }}
                    />

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={`/items/${it.id}.png`}
                        alt=""
                        width={28}
                        height={28}
                        loading="lazy"
                        title={it.name}
                        style={{
                          imageRendering: "pixelated",
                          borderRadius: 6,
                        }}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.onerror = null;
                          img.src = "/items/placeholder.png";
                        }}
                      />

                      <div style={{ fontWeight: 800 }}>
                        {it.name} {it.notes ? <span style={{ opacity: 0.75 }}>{it.notes}</span> : null}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", opacity: 0.9, fontWeight: 800 }}>{pts}</div>

                    <div
                      style={{
                        textAlign: "center",
                        fontWeight: 900,
                        borderRadius: 10,
                        padding: "6px 8px",
                        background: isChecked ? "#1aff00" : "#ff0000",
                        color: isChecked ? "#001a00" : "#220000",
                        border: "1px solid rgba(0,0,0,0.35)",
                      }}
                    >
                      {isChecked ? "✓" : "✕"}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        Checklist is stored locally on this device for <b>{rsn || playerId}</b>.
      </div>
    </section>
  );
}
