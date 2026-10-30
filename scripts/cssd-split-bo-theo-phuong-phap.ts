#!/usr/bin/env npx tsx
/**
 * Tách bộ dụng cụ theo phương pháp tiệt khuẩn của loại (chỉ DB LOCAL).
 *   npx tsx scripts/cssd-split-bo-theo-phuong-phap.ts
 */
import { createClient } from "@supabase/supabase-js";
import { applyHeatSplitForAllLowHeatLoai } from "../src/modules/cssd-erp/workflow/application/cssd-heat-split-apply";
import { resolveLocalSupabaseEnv } from "./lib/resolve-local-supabase-env.mjs";

async function main() {
  const local = await resolveLocalSupabaseEnv();
  const sb = createClient(local.url, local.serviceKey, { auth: { persistSession: false } });
  const { loaiCount, result } = await applyHeatSplitForAllLowHeatLoai(sb);
  console.log(`Loại nhiệt thấp: ${loaiCount} · tách ${result.split.length} bộ · bỏ qua ${result.skipped.length}`);
  for (const s of result.split) console.log(`  ${s.maBo} → ${s.maSub} (${s.movedLines} dòng)`);
  for (const s of result.skipped) console.log(`  BỎ QUA ${s.maBo}: ${s.reason}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
