#!/usr/bin/env npx tsx
/**
 * Đồng bộ permission-registry → sys_permissions + gán full ADMIN + preset KSNK.
 * Cùng logic nút 「Đồng bộ registry」 trên UI (rbac-registry-sync.ts).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getFlatPermissions } from "../src/lib/permission-registry";
import { upsertRegistryPermissionsAndAdminMappings } from "../src/modules/quan-tri-he-thong/phan-quyen/actions/rbac-registry-sync";
import { resolveLocalSupabaseEnv } from "./lib/resolve-local-supabase-env.mjs";

function parseEnv(raw: string) {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const eq = text.indexOf("=");
    if (eq < 0) continue;
    out[text.slice(0, eq).trim()] = text.slice(eq + 1).trim();
  }
  return out;
}

async function main() {
  const useLocal = process.argv.includes("--local");
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error("[admin:rbac:sync] Không tìm thấy .env.local");
    process.exit(1);
  }

  const env = parseEnv(readFileSync(envPath, "utf8"));
  let url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  let serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (useLocal) {
    try {
      const local = await resolveLocalSupabaseEnv({ cwd: process.cwd() });
      url = local.url;
      serviceKey = local.serviceKey;
      if (local.source !== "supabase-status") {
        console.error(`[admin:rbac:sync] local env via ${local.source} (bypass Docker CLI)`);
      }
    } catch (err) {
      console.error("[admin:rbac:sync]", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  if (!url || !serviceKey) {
    console.error("[admin:rbac:sync] Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const registryCount = getFlatPermissions().length;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`[admin:rbac:sync] Registry SSOT: ${registryCount} permissions — syncing…`);

  await upsertRegistryPermissionsAndAdminMappings(supabase);

  const { count: dbCount, error: countErr } = await supabase
    .from("sys_permissions")
    .select("*", { count: "exact", head: true });
  if (countErr) {
    console.error("[admin:rbac:sync] Không đếm được sys_permissions:", countErr.message);
    process.exit(1);
  }

  const { data: adminRole } = await supabase.from("sys_roles").select("id").eq("name", "ADMIN").maybeSingle();
  let adminGranted = 0;
  if (adminRole?.id) {
    const { count, error: grantErr } = await supabase
      .from("sys_role_permissions")
      .select("*", { count: "exact", head: true })
      .eq("role_id", adminRole.id);
    if (grantErr) {
      console.error("[admin:rbac:sync] Không đếm được quyền ADMIN:", grantErr.message);
      process.exit(1);
    }
    adminGranted = count ?? 0;
  }

  console.log(
    `[admin:rbac:sync] OK — db_permissions=${dbCount}, admin_granted=${adminGranted}, registry_expected=${registryCount}`,
  );

  if ((dbCount ?? 0) < registryCount || adminGranted < (dbCount ?? 0)) {
    console.error("[admin:rbac:sync] Parity chưa đạt sau sync.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[admin:rbac:sync] Lỗi:", err);
  process.exit(1);
});
