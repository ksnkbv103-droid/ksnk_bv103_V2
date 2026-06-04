import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** RPC dashboard mà app gọi sau reform hybrid (Command Center + module tabs). */
const APP_DASHBOARD_RPC = [
  "rpc_dashboard_vst_strategic_analytics",
  "rpc_dashboard_gsc_strategic_analytics",
  "rpc_get_compliance_dashboard_v4",
  "rpc_get_dashboard_ksnk_staff_supervision_stats",
] as const;

/** Legacy RPC — DROP migration 20260604110000 (không còn stub deprecated). */
const DROPPED_LEGACY_DASHBOARD_RPC = [
  "rpc_get_vst_dashboard",
  "rpc_get_vst_dashboard_v2",
  "rpc_get_vst_moment_table_only",
  "rpc_get_compliance_dashboard",
  "rpc_get_dashboard_summary_table",
] as const;

function activeMigrationSql(): string {
  const dir = join(process.cwd(), "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.startsWith("."))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
}

describe("dashboard RPC contract (migrations)", () => {
  const sql = activeMigrationSql();

  it.each(APP_DASHBOARD_RPC)("defines %s in active migrations", (rpc) => {
    expect(sql).toMatch(new RegExp(`FUNCTION (public\\.${rpc}|"public"\\."${rpc}")`));
  });

  it.each(DROPPED_LEGACY_DASHBOARD_RPC)("DROP migration removes %s", (rpc) => {
    expect(sql).toMatch(new RegExp(`DROP FUNCTION IF EXISTS public\\.${rpc}`, "i"));
  });
});
