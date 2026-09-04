#!/usr/bin/env node
/**
 * Gate probe 5 vai trò KSNK + residual bang_kiem permissive policies.
 * Exit 0 khi missing_active_roles=[], legacy_assignments=[], bang_kiem_permissive_policies=[].
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const local = process.argv.includes("--local");
const sqlFile = path.join(root, "scripts/sql/rbac-five-roles-precheck.sql");

const args = [
  path.join(root, "scripts/run-supabase-sql.mjs"),
  local ? "--local" : "--linked",
  "--file",
  sqlFile,
];

const run = spawnSync(process.execPath, args, {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});

process.stdout.write(run.stdout || "");
process.stderr.write(run.stderr || "");

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

const text = `${run.stdout || ""}\n${run.stderr || ""}`;
let payload = null;
try {
  const match = text.match(/\{[\s\S]*"active_roles"[\s\S]*\}/);
  if (match) payload = JSON.parse(match[0]);
} catch {
  payload = null;
}

if (!payload) {
  console.error("[trial:rbac:roles] Không parse được JSON probe — kiểm tra run-supabase-sql output.");
  process.exit(1);
}

const missing = payload.missing_active_roles ?? [];
const legacy = payload.legacy_assignments ?? [];
const permissive = payload.bang_kiem_permissive_policies ?? [];
const counts = payload.role_permission_counts ?? {};

const blockers = [];
if (Array.isArray(missing) && missing.length > 0) {
  blockers.push(`Thiếu role active: ${missing.join(", ")}`);
}
if (Array.isArray(legacy) && legacy.length > 0) {
  blockers.push(`Còn gán legacy: ${JSON.stringify(legacy)}`);
}
if (Array.isArray(permissive) && permissive.length > 0) {
  blockers.push(`gstt_dm_bang_kiem còn policy permissive: ${permissive.join(", ")}`);
}
for (const role of [
  "ADMIN",
  "NHAN_VIEN_KSNK",
  "HOI_DONG_KSNK",
  "MANG_LUOI_KSNK",
  "KHACH_THONG_KE_GSTT",
]) {
  const n = Number(counts[role] ?? 0);
  if (n < 1) blockers.push(`Role ${role} không có permission mapping (${n})`);
}

if (blockers.length) {
  console.error("[trial:rbac:roles] FAIL");
  for (const b of blockers) console.error(` - ${b}`);
  process.exit(1);
}

console.log("[trial:rbac:roles] PASS — 5 roles active, no legacy assigns, bang_kiem permissive dropped");
process.exit(0);
