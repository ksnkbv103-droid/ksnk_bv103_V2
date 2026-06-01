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

function activeMigrationSql(): string {
  const dir = join(process.cwd(), "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.startsWith("."))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
}

describe("dashboard RPC contract (migrations)", () => {
  const sql = activeMigrationSql();

  it.each(APP_DASHBOARD_RPC)("defines %s in active migrations", (rpc) => {
    expect(sql).toMatch(new RegExp(`FUNCTION (public\\.${rpc}|"public"\\."${rpc}")`));
  });
});
