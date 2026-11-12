// Cổng toàn vẹn kiểm chứng: chặn diff làm yếu test/kiểm tra mà không ghi lý do.
// Dùng: node scripts/gate-integrity.mjs [--base <ref>]  (mặc định HEAD, gồm file chưa track)
// Vi phạm: dòng THÊM có .skip( .only( @ts-ignore @ts-expect-error eslint-disable --no-verify;
//          dòng XÓA chứa expect( trong *.spec.ts(x). Bỏ qua nếu dòng (hoặc dòng ngay trên) có «gate-ok: <lý do>»;
//          với dòng xóa expect: file đó có dòng thêm nào chứa «gate-ok:» thì bỏ qua.
// Exit 1 + in file:dòng khi có vi phạm.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "HEAD";
const SELF = "scripts/gate-integrity.mjs";
const ADD_RE = /\.(skip|only)\(|@ts-ignore|@ts-expect-error|eslint-disable|--no-verify/;
const OK_RE = /gate-ok:\s*\S/;
const CODE_RE = /\.(m?[jt]sx?|cjs)$/;

const git = (a) => spawnSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout || "";
const hits = [];
const delHits = new Map(); // file -> [hit]
const okFiles = new Set();

// Diff file đã track.
let file = null;
let oldFile = null;
let newLine = 0;
let oldLine = 0;
let prevAdded = "";
for (const l of git(["diff", "-U0", "--no-color", base]).split("\n")) {
  if (l.startsWith("--- ")) { oldFile = l.startsWith("--- a/") ? l.slice(6) : null; continue; }
  if (l.startsWith("+++ ")) { file = l.startsWith("+++ b/") ? l.slice(6) : oldFile; continue; } // xóa file: dùng tên cũ
  const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)/);
  if (h) { oldLine = +h[1]; newLine = +h[2]; prevAdded = ""; continue; }
  if (!file || file === SELF || !CODE_RE.test(file)) continue;
  if (l.startsWith("+")) {
    const t = l.slice(1);
    if (OK_RE.test(t)) okFiles.add(file);
    if (ADD_RE.test(t) && !OK_RE.test(t) && !OK_RE.test(prevAdded)) hits.push(`${file}:${newLine}  thêm: ${t.trim().slice(0, 100)}`);
    prevAdded = t;
    newLine++;
  } else if (l.startsWith("-")) {
    const t = l.slice(1);
    if (/\.spec\.tsx?$/.test(file) && /\bexpect\(/.test(t)) delHits.set(file, [...(delHits.get(file) || []), `${file}:${oldLine} (cũ)  xóa: ${t.trim().slice(0, 100)}`]);
    oldLine++;
  }
}

for (const [f, hs] of delHits) if (!okFiles.has(f)) hits.push(...hs);

// File chưa track: quét toàn bộ nội dung.
for (const f of git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)) {
  if (f === SELF || !CODE_RE.test(f)) continue;
  let lines;
  try { lines = readFileSync(f, "utf8").split("\n"); } catch { continue; }
  lines.forEach((t, i) => {
    if (ADD_RE.test(t) && !OK_RE.test(t) && !OK_RE.test(lines[i - 1] || "")) hits.push(`${f}:${i + 1}  thêm: ${t.trim().slice(0, 100)}`);
  });
}

if (hits.length) {
  console.log(`[gate-integrity] ${hits.length} chỗ làm yếu kiểm chứng (thêm «// gate-ok: <lý do>» nếu cố ý):\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("[gate-integrity] 0 vi phạm.");
