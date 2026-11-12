// Ảnh chụp quyền thật trên DB local (container supabase_db_ksnk_bv103), so với scripts/data/acl-snapshot.json.
// Dùng: node scripts/acl-snapshot.mjs [--write] [--require-applied <version,...>]
//   (mặc định) --check: khác ảnh chụp → exit 1, in từng dòng thêm/bớt.
//   --write: ghi lại ảnh chụp khi đổi quyền có chủ ý (diff JSON hiện trong commit).
//   --require-applied: version migration phải có trong supabase_migrations.schema_migrations, thiếu → exit 1.
// Ghi: hàm SECURITY DEFINER ở public (anon/authenticated EXECUTE, search_path);
//      bảng public (RLS bật?, anon/authenticated INSERT/UPDATE/DELETE). Bỏ bảng zz_* (rác local).
// Container tắt → exit 1 (không bỏ qua im lặng).
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const req = args.includes("--require-applied") ? (args[args.indexOf("--require-applied") + 1] || "").split(",").filter(Boolean) : [];
const FILE = "scripts/data/acl-snapshot.json";
const CONTAINER = "supabase_db_ksnk_bv103";

const psql = (sql) => {
  const r = spawnSync("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
  if (r.status !== 0) {
    console.log(`[acl-snapshot] FAIL: không đọc được DB local (${CONTAINER}). Bật Docker/Supabase local rồi chạy lại.\n${(r.stderr || "").trim().slice(0, 300)}`);
    process.exit(1);
  }
  return r.stdout.split("\n").filter(Boolean);
};

if (req.length) {
  const have = new Set(psql("select version from supabase_migrations.schema_migrations;"));
  const miss = req.filter((v) => !have.has(v));
  if (miss.length) {
    console.log(`[acl-snapshot] FAIL: chưa apply local: ${miss.join(", ")} (chạy npm run mdm:migrate:local)`);
    process.exit(1);
  }
}

const fns = psql(`
select 'fn ' || p.oid::regprocedure::text
  || ' | anon=' || has_function_privilege('anon', p.oid, 'execute')
  || ' auth=' || has_function_privilege('authenticated', p.oid, 'execute')
  || ' | ' || coalesce((select c from unnest(p.proconfig) c where c like 'search_path=%'), 'search_path=(không)')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef;`);
const tbls = psql(`
select 'tbl ' || c.relname || ' | rls=' || c.relrowsecurity
  || ' | anon=' || concat_ws('', case when has_table_privilege('anon', c.oid, 'insert') then 'I' end,
                                 case when has_table_privilege('anon', c.oid, 'update') then 'U' end,
                                 case when has_table_privilege('anon', c.oid, 'delete') then 'D' end)
  || ' auth=' || concat_ws('', case when has_table_privilege('authenticated', c.oid, 'insert') then 'I' end,
                                 case when has_table_privilege('authenticated', c.oid, 'update') then 'U' end,
                                 case when has_table_privilege('authenticated', c.oid, 'delete') then 'D' end)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname not like 'zz\\_%';`);
const now = [...fns, ...tbls].sort();

// Nợ cũ: đếm để theo dõi giảm dần, không coi là hợp lệ.
const debt = {
  fn_thieu_pg_temp: fns.filter((l) => !/search_path=[^|]*pg_temp/.test(l)).length,
  fn_auth_goi_duoc: fns.filter((l) => /auth=true/.test(l)).length,
  fn_anon_goi_duoc: fns.filter((l) => /anon=true/.test(l)).length,
  tbl_khong_rls: tbls.filter((l) => /rls=false/.test(l)).length,
  tbl_anon_ghi: tbls.filter((l) => /anon=[IUD]/.test(l)).length,
};
const debtLine = `nợ: ${Object.entries(debt).map(([k, v]) => `${k}=${v}`).join(" · ")}`;

if (WRITE) {
  writeFileSync(FILE, JSON.stringify({ note: "Sinh bởi scripts/acl-snapshot.mjs --write từ DB local. Đổi quyền có chủ ý thì ghi lại.", debt, rows: now }, null, 2) + "\n");
  console.log(`[acl-snapshot] đã ghi ${now.length} dòng. ${debtLine}`);
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.log(`[acl-snapshot] FAIL: chưa có ${FILE}; chạy --write.`);
  process.exit(1);
}
const old = JSON.parse(readFileSync(FILE, "utf8")).rows;
const oldSet = new Set(old);
const nowSet = new Set(now);
const added = now.filter((l) => !oldSet.has(l));
const removed = old.filter((l) => !nowSet.has(l));
if (added.length || removed.length) {
  console.log(`[acl-snapshot] FAIL: quyền trên DB khác ảnh chụp (${added.length} thêm, ${removed.length} bớt). Cố ý thì chạy --write.`);
  for (const l of removed.slice(0, 40)) console.log(`- ${l}`);
  for (const l of added.slice(0, 40)) console.log(`+ ${l}`);
  process.exit(1);
}
console.log(`[acl-snapshot] OK ${now.length} dòng khớp. ${debtLine}`);
