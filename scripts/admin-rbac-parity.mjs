#!/usr/bin/env node
/**
 * RBAC registry ↔ DB parity — đọc số kỳ vọng từ permission-registry, so DB thực tế.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function parseEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const eq = text.indexOf("=");
    if (eq < 0) continue;
    out[text.slice(0, eq).trim()] = text.slice(eq + 1).trim();
  }
  return out;
}

function countRegistryFromSource(source) {
  const actionBlocks = source.match(/actions:\s*\[[^\]]+\]/g) || [];
  let permissions = 0;
  for (const block of actionBlocks) {
    permissions += (block.match(/"[A-Z_]+"/g) || []).length;
  }
  const modules = (source.match(/code:\s*"/g) || []).length;
  return { permissions, modules };
}

async function main() {
  const mode = process.argv.includes("--local") ? "local" : "linked";
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error("[admin:rbac:parity] Không tìm thấy .env.local");
    process.exit(1);
  }

  const env = parseEnv(readFileSync(envPath, "utf8"));
  let url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  let serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (mode === "local") {
    const status = spawnSync("npx", ["supabase", "status", "-o", "env"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    if (status.status !== 0) {
      console.error("[admin:rbac:parity] Supabase local chưa chạy. Thử: npx supabase start");
      process.exit(1);
    }
    for (const line of (status.stdout || "").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (!m) continue;
      if (m[1] === "API_URL") url = m[2].replace(/^"|"$/g, "");
      if (m[1] === "SERVICE_ROLE_KEY") serviceKey = m[2].replace(/^"|"$/g, "");
    }
  }

  if (!url || !serviceKey) {
    console.error("[admin:rbac:parity] Thiếu Supabase URL hoặc service role key");
    process.exit(1);
  }

  const registryFile = readFileSync(join(process.cwd(), "src/lib/permission-registry-data.ts"), "utf8");
  const { permissions: registryExpectedPermissions, modules: registryExpectedModules } =
    countRegistryFromSource(registryFile);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const [
    { count: dbPermissionCount, error: permErr },
    { data: moduleRows, error: modErr },
    { count: roleCount, error: roleErr },
    { count: rolePermLinks, error: rpErr },
    { count: userRoleLinks, error: urErr },
    { data: adminRole },
  ] = await Promise.all([
    supabase.from("sys_permissions").select("*", { count: "exact", head: true }),
    supabase.from("sys_permissions").select("module_name"),
    supabase.from("sys_roles").select("*", { count: "exact", head: true }),
    supabase.from("sys_role_permissions").select("*", { count: "exact", head: true }),
    supabase.from("sys_user_roles").select("*", { count: "exact", head: true }),
    supabase.from("sys_roles").select("id").eq("name", "ADMIN").maybeSingle(),
  ]);

  if (permErr || modErr || roleErr || rpErr || urErr) {
    console.error("[admin:rbac:parity] DB query lỗi:", permErr || modErr || roleErr || rpErr || urErr);
    process.exit(1);
  }

  const dbModuleCount = new Set((moduleRows || []).map((r) => r.module_name)).size;

  let adminGranted = 0;
  if (adminRole?.id) {
    const { count, error } = await supabase
      .from("sys_role_permissions")
      .select("*", { count: "exact", head: true })
      .eq("role_id", adminRole.id);
    if (error) {
      console.error("[admin:rbac:parity] Không đếm admin grants:", error.message);
      process.exit(1);
    }
    adminGranted = count ?? 0;
  }

  const parityOk =
    (dbPermissionCount ?? 0) >= registryExpectedPermissions &&
    adminGranted >= (dbPermissionCount ?? 0);

  const payload = {
    db_permission_count: dbPermissionCount ?? 0,
    db_module_count: dbModuleCount,
    registry_expected_permissions: registryExpectedPermissions,
    registry_expected_modules: registryExpectedModules,
    parity_ok: parityOk,
    role_count: roleCount ?? 0,
    role_permission_links: rolePermLinks ?? 0,
    user_role_links: userRoleLinks ?? 0,
    admin_granted: adminGranted,
    admin_total_should_match: dbPermissionCount ?? 0,
  };

  console.log(JSON.stringify({ rbac_parity: payload }, null, 2));

  if (!parityOk) process.exit(1);
}

main().catch((err) => {
  console.error("[admin:rbac:parity] Lỗi:", err);
  process.exit(1);
});
