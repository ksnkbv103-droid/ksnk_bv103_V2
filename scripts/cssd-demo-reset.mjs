#!/usr/bin/env node
/**
 * Xóa fact CSSD demo (giữ danh mục) — localhost pilot.
 * Usage: npm run cssd:demo:reset:local
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = `
TRUNCATE TABLE
  public.cssd_fact_su_co,
  public.cssd_fact_bao_tri,
  public.cssd_fact_kho_giao_dich,
  public.cssd_fact_kho_hoa_chat_giao_dich,
  public.cssd_fact_lo_tiet_khuan,
  public.cssd_fact_quy_trinh
RESTART IDENTITY CASCADE;
`;

const r = spawnSync("npx", ["supabase", "db", "query", "--local", "--agent=no", sql], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});
process.exit(r.status ?? 1);
