// lib/loadActiveConfig.ts
import { createClient } from "@supabase/supabase-js";

export type RuntimeItemDef = {
  id: string;
  name: string;
  points: number | null;
  group?: string;
  notes?: string;
};

export type RuntimeRequirement =
  | { type: "allOf"; itemIds: string[]; label?: string }
  | { type: "anyOf"; itemIds: string[]; label?: string };

export type RuntimeRankDef = {
  id: string;
  label: string;
  thresholdPoints?: number;
  requiresBase: boolean;
  requiresInfernal?: boolean;
};

export type RuntimeConfig = {
  schemaVersion: number;
  itemPoints: {
    items: RuntimeItemDef[];
    requiredRequirements: RuntimeRequirement[];
  };
  pvmRanks: RuntimeRankDef[];
};

function sbAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // on the server this should always exist; fail soft
    console.error("[loadActiveConfig] missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url || "", key || "", { auth: { persistSession: false } });
}

export async function loadActiveConfig(): Promise<RuntimeConfig | null> {
  const sb = sbAdmin();

  const { data, error } = await sb
    .from("config_versions")
    .select("config_json")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[loadActiveConfig] error:", error.message);
    return null;
  }

  const cfg = (data as any)?.config_json ?? null;
  if (!cfg) return null;

  if (!cfg?.itemPoints?.items || !cfg?.itemPoints?.requiredRequirements || !cfg?.pvmRanks) return null;

  return cfg as RuntimeConfig;
}