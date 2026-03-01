// scripts/seed-config.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ✅ Use the same path alias as the app (most reliable)
import { ITEMS, REQUIRED_REQUIREMENTS } from "@/lib/reborn_item_points";
import { PVM_RANKS } from "@/lib/reborn_rank_rules";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const url = must("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY");

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const config = {
    schemaVersion: 1,
    itemPoints: {
      items: ITEMS,
      requiredRequirements: REQUIRED_REQUIREMENTS,
    },
    pvmRanks: PVM_RANKS,
  };

  // deactivate old
  await sb.from("config_versions").update({ is_active: false }).eq("is_active", true);

  // insert new active
  const { data, error } = await sb
    .from("config_versions")
    .insert({
      name: `Seed ${new Date().toISOString()}`,
      config_json: config,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  console.log("✅ Seeded active config_versions row id:", data?.id);
}

main().catch((e) => {
  console.error("❌ seed-config failed:", e?.message ?? e);
  process.exit(1);
});