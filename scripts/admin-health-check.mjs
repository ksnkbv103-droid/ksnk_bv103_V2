#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relPath) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) {
    return { ok: false, value: "", error: `Missing file: ${relPath}` };
  }
  return { ok: true, value: readFileSync(abs, "utf8"), error: "" };
}

function mustInclude(content, needle, label, failures) {
  if (!content.includes(needle)) failures.push(label);
}

function mustNotInclude(content, needle, label, failures) {
  if (content.includes(needle)) failures.push(label);
}

const failures = [];
const checks = [];

function addCheck(ok, name) {
  checks.push({ ok, name });
}

const migrationBaseline = "supabase/migrations/20260530000000_init_pilot_baseline.sql";
const migrationRbacRepair = "supabase/migrations/20260603120000_v_auth_permissions_compat_repair.sql";

addCheck(existsSync(join(root, migrationBaseline)), `has migration ${migrationBaseline}`);
addCheck(existsSync(join(root, migrationRbacRepair)), `has migration ${migrationRbacRepair}`);

const masterCrud = read("src/modules/quan-tri-he-thong/danh-muc/actions/master-crud-core.ts");
if (!masterCrud.ok) failures.push(masterCrud.error);
else {
  mustNotInclude(
    masterCrud.value,
    "sys_roles không hỗ trợ bật/tắt is_active",
    "master-crud-core still blocks sys_roles toggle",
    failures,
  );
  mustNotInclude(
    masterCrud.value,
    "sys_roles không hỗ trợ soft delete theo is_active",
    "master-crud-core still blocks sys_roles soft delete",
    failures,
  );
  mustInclude(
    masterCrud.value,
    'query = query.order("is_active", { ascending: false });',
    "master-crud-core missing is_active ordering",
    failures,
  );
}

const gscRead = read("src/modules/giam-sat-chung/actions/giam-sat-chung-read.actions.ts");
if (!gscRead.ok) failures.push(gscRead.error);
else {
  mustInclude(
    gscRead.value,
    "p_categories",
    "gsc-read still uses wrong rpc params",
    failures,
  );
  mustInclude(
    gscRead.value,
    '.from("gstt_dm_khu_vuc_giam_sat")',
    "gsc-read missing fallback gstt_dm_khu_vuc_giam_sat query",
    failures,
  );
}

const mdmGateway = read("src/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions.ts");
if (!mdmGateway.ok) failures.push(mdmGateway.error);
else {
  mustInclude(
    mdmGateway.value,
    '.from("gstt_dm_khu_vuc_giam_sat")',
    "master-data-gateway missing fallback gstt_dm_khu_vuc_giam_sat query",
    failures,
  );
}

const dmTable = read("src/modules/quan-tri-he-thong/danh-muc/views/GenericDmMasterDataTable.tsx");
if (!dmTable.ok) failures.push(dmTable.error);
else {
  mustInclude(dmTable.value, "onRowClick", "generic table missing row-click support", failures);
}

const dmPage = read("src/modules/quan-tri-he-thong/danh-muc/views/GenericDmMasterPage.tsx");
if (!dmPage.ok) failures.push(dmPage.error);
else {
  mustInclude(dmPage.value, "onRowClick", "generic page missing row-click wiring", failures);
  mustInclude(dmPage.value, "m.openEdit(row)", "generic page not opening edit on row click", failures);
}

const dmModal = read("src/modules/quan-tri-he-thong/danh-muc/views/GenericDmEditModal.tsx");
if (!dmModal.ok) failures.push(dmModal.error);
else {
  mustNotInclude(
    dmModal.value,
    "Vai trò hệ thống không dùng bật/tắt theo `is_active`",
    "generic modal still shows disabled-role-active warning",
    failures,
  );
}

console.log("=== Admin Health Check ===");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}: ${c.name}`);
}
if (failures.length) {
  console.log(`\nFound ${failures.length} issues:`);
  for (const f of failures) console.log(`- ${f}`);
  process.exit(2);
}

console.log("PASS: admin core contract checks");
process.exit(0);
