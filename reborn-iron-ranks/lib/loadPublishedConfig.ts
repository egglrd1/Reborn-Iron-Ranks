// lib/loadPublishedConfig.ts
import { createClient } from "@supabase/supabase-js";
import type { ItemDef, Requirement } from "./reborn_item_points";
import type { RankDef } from "./reborn_rank_rules";

/**
 * This loader is future-proof.
 * 
 * CURRENT BEHAVIOR:
 * - Falls back to static in-code config (no DB required yet)
 * - Does NOT change any runtime behavior
 * 
 * FUTURE:
 * - When admin publishing is added, this file will read
 *   from published_config table instead.
 */

import {
  ITEMS as STATIC_ITEMS,
  REQUIRED_REQUIREMENTS as STATIC_REQUIREMENTS,
} from "./reborn_item_points";

import {
  PVM_RANKS as STATIC_PVM_RANKS,
} from "./reborn_rank_rules";

export type PublishedConfig = {
  items: ItemDef[];
  requiredRequirements: Requirement[];
  pvmRanks: RankDef[];
};

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Load published config.
 *
 * Right now this safely returns static config.
 * Later we will swap to DB-driven config without changing
 * any consuming files.
 */
export async function loadPublishedConfig(): Promise<PublishedConfig> {
  const sb = supabaseAdmin();

  if (!sb) {
    // No DB configured → fallback
    return {
      items: STATIC_ITEMS,
      requiredRequirements: STATIC_REQUIREMENTS,
      pvmRanks: STATIC_PVM_RANKS,
    };
  }

  try {
    const { data, error } = await sb
      .from("published_config")
      .select("config_json")
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data?.config_json) {
      return {
        items: STATIC_ITEMS,
        requiredRequirements: STATIC_REQUIREMENTS,
        pvmRanks: STATIC_PVM_RANKS,
      };
    }

    const cfg = data.config_json;

    return {
      items: cfg.items ?? STATIC_ITEMS,
      requiredRequirements:
        cfg.requiredRequirements ?? STATIC_REQUIREMENTS,
      pvmRanks: cfg.pvmRanks ?? STATIC_PVM_RANKS,
    };
  } catch {
    return {
      items: STATIC_ITEMS,
      requiredRequirements: STATIC_REQUIREMENTS,
      pvmRanks: STATIC_PVM_RANKS,
    };
  }
}