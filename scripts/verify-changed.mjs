// Chọn và chạy lệnh verify theo file đã đổi (bảng «Vừa làm → Lệnh» trong CLAUDE.md).
// Dùng: node scripts/verify-changed.mjs [--dry] [--base <ref>]  (mặc định so với HEAD, gồm file chưa track)
// Chỉ in dòng PASS/FAIL; lệnh lỗi in 30 dòng cuối. Exit 1 nếu có lệnh lỗi.
import { spawnSync } from "node:child_process";
import { codeStamp, writeStamp } from "./verify-stamp.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "HEAD";

const git = (a) => spawnSync("git", a, { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
const files = [...new Set([...git(["diff", "--name-only", base]), ...git(["ls-files", "--others", "--exclude-standard"])])];

const cmds = new Map();
const add = (cmd, why) => cmds.set(cmd, [...(cmds.get(cmd) || []), why]);
const specs = [];
const e2es = [];
const srcs = [];
// Đường dẫn vào lệnh shell phải bọc nháy: thư mục có ngoặc như src/app/(auth)/… làm sh báo «syntax error near unexpected token '('».
const sq = (p) => `'${p.replace(/'/g, `'\\''`)}'`;
const migs = [];

for (const f of files) {
  if (/^src\/.*\.tsx?$/.test(f) && !/\.spec\.tsx?$/.test(f)) srcs.push(f);
  if (/^supabase\/migrations\//.test(f)) {
    // Bản linked luôn fail ở worktree chưa `supabase link` → dùng bản local.
    add("npm run verify:mdm:local", f);
    const v = f.match(/^supabase\/migrations\/(\d{14})_/);
    if (v) migs.push(v[1]);
  }
  else if (/^e2e\/.*\.spec\.tsx?$/.test(f)) e2es.push(f);
  else if (/\.spec\.tsx?$/.test(f)) specs.push(f);
  else if (/^(docs\/|\.claude\/|CLAUDE\.md$|README\.md$|CHANGELOG\.md$)/.test(f) || /\.md$/.test(f)) add("npm run docs:links:check", f);
  else if (/\/(actions|application|domain)\//.test(f) || /^src\/lib\//.test(f) || /^scripts\//.test(f)) add("npm run verify:engineering", f);
  else if (/^src\//.test(f) || f === "package.json") add("npm run verify:quick", f);
}
// Spec liên quan tới source đã đổi (đồ thị import); không có spec liên quan thì vitest thoát 0.
if (srcs.length) add(`npx vitest related --run --passWithNoTests ${srcs.map(sq).join(" ")}`, `${srcs.length} source`);
// Migration phải đã apply local, rồi so quyền thật trên DB với ảnh chụp ACL.
if (migs.length) add(`node scripts/acl-snapshot.mjs --require-applied ${[...new Set(migs)].join(",")}`, `${migs.length} migration`);
if (specs.length) add(`npm run test:cssd -- ${specs.map(sq).join(" ")}`, `${specs.length} spec`);
// Spec Playwright (e2e/) nằm ngoài include của vitest: đưa vào test:cssd chỉ ra «No test files found» rồi PASS giả → báo SKIP.
if (e2es.length) console.log(`SKIP ${e2es.length} spec Playwright (${e2es.join(", ")}): vitest không chạy e2e/, chạy tay npm run test:e2e (cần tài khoản thử)`);
// Đụng action/domain thì vẫn cần typecheck/build (verify:engineering không build).
if (cmds.has("npm run verify:engineering") && !cmds.has("npm run verify:quick")) add("npm run verify:quick", "kèm engineering");

// Cổng toàn vẹn kiểm chứng chạy đầu tiên (chặn .skip/.only/@ts-ignore/eslint-disable/xóa expect không ghi «gate-ok:»).
if (files.length) {
  const rest = [...cmds];
  cmds.clear();
  add(`node scripts/gate-integrity.mjs --base ${base}`, "luôn chạy");
  // Truy vết đặc tả chỉ cần khi đụng module nghiệp vụ (đọc thư mục đặc tả ngoài repo nên chỉ chạy local, không có trong CI).
  if (files.some((f) => /^src\/modules\//.test(f))) add("node scripts/trace-dac-ta.mjs", "src/modules đổi: mã đặc tả dẫn trong code phải có thật");
  for (const [c, w] of rest) cmds.set(c, w);
}

if (!cmds.size) {
  console.log("[verify-changed] Không có file đổi cần verify.");
  process.exit(0);
}

let failed = 0;
for (const [cmd, why] of cmds) {
  if (dry) {
    console.log(`DRY  ${cmd}  <- ${why.slice(0, 3).join(", ")}${why.length > 3 ? ` (+${why.length - 3})` : ""}`);
    continue;
  }
  const t = Date.now();
  const r = spawnSync(cmd, { shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const secs = Math.round((Date.now() - t) / 1000);
  if (r.status === 0) {
    console.log(`PASS ${cmd} (${secs}s)`);
  } else {
    failed++;
    const tail = `${r.stdout || ""}${r.stderr || ""}`.trim().split("\n").slice(-30).join("\n");
    console.log(`FAIL ${cmd} (${secs}s, exit ${r.status})\n${tail}`);
  }
}
// PASS hết → ghi dấu verify cho Stop hook (.claude/hooks/stop-gate.mjs).
if (!dry && !failed) writeStamp(codeStamp());
process.exit(failed ? 1 : 0);
