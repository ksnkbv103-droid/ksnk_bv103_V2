// Chọn và chạy lệnh verify theo file đã đổi (bảng «Vừa làm → Lệnh» trong CLAUDE.md).
// Dùng: node scripts/verify-changed.mjs [--dry] [--base <ref>]  (mặc định so với HEAD, gồm file chưa track)
// Chỉ in dòng PASS/FAIL; lệnh lỗi in 30 dòng cuối. Exit 1 nếu có lệnh lỗi.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "HEAD";

const git = (a) => spawnSync("git", a, { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
const files = [...new Set([...git(["diff", "--name-only", base]), ...git(["ls-files", "--others", "--exclude-standard"])])];

const cmds = new Map();
const add = (cmd, why) => cmds.set(cmd, [...(cmds.get(cmd) || []), why]);
const specs = [];

for (const f of files) {
  if (/^supabase\/migrations\//.test(f)) add("npm run verify:mdm", f);
  else if (/\.spec\.tsx?$/.test(f)) specs.push(f);
  else if (/^(docs\/|\.claude\/|CLAUDE\.md$|README\.md$|CHANGELOG\.md$)/.test(f) || /\.md$/.test(f)) add("npm run docs:links:check", f);
  else if (/\/(actions|application|domain)\//.test(f) || /^src\/lib\//.test(f) || /^scripts\//.test(f)) add("npm run verify:engineering", f);
  else if (/^src\//.test(f) || f === "package.json") add("npm run verify:quick", f);
}
if (specs.length) add(`npm run test:cssd -- ${specs.join(" ")}`, `${specs.length} spec`);
// Đụng action/domain thì vẫn cần typecheck/build (verify:engineering không build).
if (cmds.has("npm run verify:engineering") && !cmds.has("npm run verify:quick")) add("npm run verify:quick", "kèm engineering");

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
process.exit(failed ? 1 : 0);
