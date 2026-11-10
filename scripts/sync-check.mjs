#!/usr/bin/env node
/**
 * sync:check — repo, DB và bản deploy có cùng một trạng thái không.
 *
 * 1. Migration: so TÊN (bỏ timestamp, vì prod ghi version khác tên file) giữa
 *    `supabase/migrations/*.sql` và `supabase_migrations.schema_migrations`.
 * 2. Deploy: SHA Production gần nhất (GitHub deployments) so với `origin/main`.
 *
 * Usage:
 *   node scripts/sync-check.mjs --linked            # prod (cần SUPABASE_ACCESS_TOKEN)
 *   node scripts/sync-check.mjs --local             # DB local
 *   node scripts/sync-check.mjs --db-names f.json   # danh sách tên đã xuất sẵn (mảng chuỗi hoặc {migrations:[{name}]})
 *   thêm --no-deploy để bỏ bước 2.
 * Exit 1 khi lệch; exit 0 kèm «BỎ QUA» khi không lấy được dữ liệu (thiếu token/gh), trừ khi có --strict.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const strict = flag("--strict");

/** Migration cố ý chưa lên prod. Mỗi dòng phải có lý do; xóa dòng khi đã apply. */
const ALLOW_REPO_ONLY = new Map([
  ["cssd_kd4_transfer_lock_by_id", "KD-4 còn nợ khóa deadlock nhiều dòng (roadmap §5)"],
]);

const LOCAL_DB_URL =
  process.env.SUPABASE_LOCAL_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SQL = "select name from supabase_migrations.schema_migrations where name is not null order by version";

let failed = false;
let skipped = false;
const skip = (msg) => {
  skipped = true;
  console.log(`BỎ QUA: ${msg}`);
};

function repoNames() {
  return readdirSync(join(root, "supabase/migrations"))
    .map((f) => f.match(/^\d{14}_(.+)\.sql$/)?.[1])
    .filter(Boolean);
}

function parseNames(raw) {
  const data = JSON.parse(raw);
  const rows = Array.isArray(data) ? data : (data.migrations ?? data.rows ?? data.result ?? []);
  return rows.map((r) => (typeof r === "string" ? r : r.name)).filter(Boolean);
}

function dbNames() {
  const file = opt("--db-names");
  if (file) return parseNames(readFileSync(file, "utf8"));
  // CI và worktree không có `supabase link` → truyền ref qua SUPABASE_PROJECT_REF.
  const ref = process.env.SUPABASE_PROJECT_REF;
  const linked = ref ? ["--linked", "--project-ref", ref] : ["--linked"];
  const target = flag("--local") ? ["--db-url", LOCAL_DB_URL] : linked;
  const r = spawnSync(
    "npx",
    ["supabase", "db", "query", ...target, "--agent=no", "--output-format", "json", SQL],
    { cwd: root, encoding: "utf8" },
  );
  if (r.status !== 0) {
    skip(`không đọc được migration từ DB (${(r.stderr || "").trim().split("\n").pop()})`);
    return null;
  }
  return parseNames(r.stdout.slice(r.stdout.indexOf(r.stdout.match(/[[{]/)?.[0] ?? "[")));
}

function checkMigrations() {
  const repoList = repoNames();
  const repo = new Set(repoList);
  const db = dbNames();
  if (!db) return;
  const dbSet = new Set(db);
  // Đếm theo số lần xuất hiện: repo có vài tên trùng (2 file cùng tên), DB phải có đủ số bản.
  const count = (list) => list.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map());
  const repoCount = count(repoList);
  const dbCount = count(db);
  const repoOnly = [...repo].filter(
    (n) => repoCount.get(n) > (dbCount.get(n) ?? 0) && !ALLOW_REPO_ONLY.has(n),
  );
  const dbOnly = [...dbSet].filter((n) => !repo.has(n));
  console.log(`Migration: repo ${repo.size} · DB ${dbSet.size} tên khác nhau`);
  for (const [n, why] of ALLOW_REPO_ONLY) if (!dbSet.has(n)) console.log(`  (cho phép) ${n} — ${why}`);
  if (repoOnly.length) {
    failed = true;
    console.log(`LỆCH: ${repoOnly.length} migration có trong repo, CHƯA có trên DB:`);
    repoOnly.forEach((n) => console.log(`  - ${n}`));
  }
  if (dbOnly.length) {
    // DB có mà repo không có: thường là tên đổi khi apply tay — báo để rà, không tự kết luận.
    console.log(`CẢNH BÁO: ${dbOnly.length} tên trên DB không khớp file nào trong repo:`);
    dbOnly.forEach((n) => console.log(`  - ${n}`));
  }
  if (!repoOnly.length) console.log("Migration: repo không có file nào thiếu trên DB.");
}

function sh(cmd, argv) {
  const r = spawnSync(cmd, argv, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

function checkDeploy() {
  const repo = sh("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
  const sha =
    repo &&
    sh("gh", ["api", `repos/${repo}/deployments?environment=Production&per_page=1`, "-q", ".[0].sha"]);
  if (!sha) return skip("không đọc được deployment Production qua gh");
  const behind = sh("git", ["rev-list", "--count", `${sha}..origin/main`]);
  if (behind === null) return skip(`SHA deploy ${sha.slice(0, 8)} không có trong repo local (cần git fetch)`);
  if (behind === "0") return console.log(`Deploy: Production = origin/main (${sha.slice(0, 8)}).`);
  failed = true;
  console.log(`LỆCH: Production đang ở ${sha.slice(0, 8)}, origin/main đi trước ${behind} commit.`);
}

checkMigrations();
if (!flag("--no-deploy")) checkDeploy();
if (failed || (strict && skipped)) process.exit(1);
