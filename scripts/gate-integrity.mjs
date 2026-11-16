// Cổng toàn vẹn kiểm chứng: chặn diff làm yếu test/kiểm tra mà không ghi lý do.
// Dùng: node scripts/gate-integrity.mjs [--base <ref>]  (mặc định HEAD, gồm file chưa track)
// Vi phạm: dòng THÊM có .skip( .only( @ts-ignore @ts-expect-error eslint-disable --no-verify;
//          dòng XÓA chứa expect( trong *.spec.ts(x). Bỏ qua nếu dòng (hoặc dòng ngay trên) có «gate-ok: <lý do>»;
//          với dòng xóa expect: file đó có dòng thêm nào chứa «gate-ok:» thì bỏ qua.
// Ngoại lệ mã chết (PO 2026-11-16): spec bị xóa NGUYÊN file thì bỏ qua khi, trên cây làm việc cuối (cả file chưa add):
//          (a) cùng diff xóa nguyên một file mã (không phải spec/test) cùng thư mục, tên bắt đầu «<tên spec bỏ .spec.ts(x)>.»
//          (foo.spec.ts ↔ foo.ts, foo.actions.ts), và (b) thư mục đó không còn file mã nào như vậy, cả trên đĩa (kể cả file bị
//          .gitignore) lẫn trong index cuối (chặt hơn lời PO: không bỏ rơi nguồn còn sống). File chỉ đổi tên (kể cả sang file chưa
//          add) không tính là xóa; spec chỉ bị bớt expect( vẫn bị chặn; không dựng được ảnh chụp cây cuối (lỗi git, git bỏ dò đổi
//          tên) thì không miễn.
//          Giới hạn đã biết: quy tắc dựa trên tên + «bị xóa», không chứng minh spec chỉ phủ mã đã xóa (spec còn import module
//          sống; nội dung nguồn gộp sang file có sẵn rồi xóa) → người duyệt đọc dòng «miễn …» ở đầu ra. Dòng này chỉ hiện khi chạy
//          thẳng `node scripts/gate-integrity.mjs`; verify-changed.mjs chỉ in «PASS» khi exit 0 và nuốt đầu ra (SO_NO_APPKSNK).
// Exit 1 + in file:dòng khi có vi phạm.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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

// Ảnh chụp cây làm việc cuối trong index + kho đối tượng tạm (index và kho thật không đổi): «add -A» gom cả file chưa track nên
// đổi tên sang file chưa add vẫn nhận ra (-M) và xóa-rồi-tạo-lại không còn là xóa. Bước nào lỗi → null (không miễn).
// top = gốc worktree (cwd có thể là thư mục con).
const finalTree = () => {
  let dir = "";
  try {
    dir = mkdtempSync(join(tmpdir(), "gate-integrity-"));
    mkdirSync(join(dir, "objects"));
    const run = (a, env) => {
      const r = spawnSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env, LC_ALL: "C" } }); // C: cảnh báo git luôn bằng tiếng Anh để khớp regex bên dưới
      if (r.status !== 0) throw new Error(`git ${a[0]} → ${r.status ?? r.error?.message}: ${(r.stderr || "").trim().split("\n")[0]}`);
      if (/rename detection was skipped/.test(r.stderr || "")) throw new Error(`git ${a[0]} bỏ dò đổi tên (quá nhiều file, diff.renameLimit)`);
      return r.stdout;
    };
    const top = resolve(run(["rev-parse", "--show-toplevel"]).trim());
    copyFileSync(resolve(run(["rev-parse", "--git-path", "index"]).trim()), join(dir, "index"));
    const env = {
      GIT_INDEX_FILE: join(dir, "index"),
      GIT_OBJECT_DIRECTORY: join(dir, "objects"),
      GIT_ALTERNATE_OBJECT_DIRECTORIES: resolve(run(["rev-parse", "--git-path", "objects"]).trim()),
    };
    const list = (a) => run(a, env).split("\0").filter(Boolean);
    list(["add", "-A"]);
    return { top, deleted: list(["diff", "--cached", "-z", "-M", "--name-only", "--diff-filter=D", base]), kept: list(["ls-files", "-z", "--full-name", "--", ":/"]) };
  } catch (e) {
    console.error(`[gate-integrity] không dựng được ảnh chụp cây cuối, không miễn xóa spec: ${e.message}`);
    return null;
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
};
const tree = delHits.size ? finalTree() : null;
const dirOf = (p) => p.slice(0, p.lastIndexOf("/") + 1);
const isSrc = (p) => CODE_RE.test(p) && !/\.(spec|test)\.[jt]sx?$/.test(p);
const deadWithSource = (f) => {
  const m = f.match(/^(.*\/)?([^/]+)\.spec\.tsx?$/);
  if (!m || !tree || !tree.deleted.includes(f)) return false;
  const dir = m[1] || "";
  const near = (n) => isSrc(n) && n.startsWith(`${m[2]}.`); // n = tên file, không gồm thư mục
  let alive; // nguồn còn sống: có trên đĩa từ gốc repo (cả file bị .gitignore) HOẶC còn trong index cuối; thư mục không còn trên đĩa thì không còn nguồn trên đĩa
  try { alive = readdirSync(join(tree.top, dir)).some(near); } catch (e) { alive = e.code !== "ENOENT"; }
  alive = alive || tree.kept.some((p) => dirOf(p) === dir && near(p.slice(dir.length))); // đĩa lệch index (skip-worktree, assume-unchanged, gốc repo có dấu cách cuối) vẫn là nguồn sống
  return !alive && tree.deleted.some((p) => dirOf(p) === dir && near(p.slice(dir.length)));
};
const freed = [];
for (const [f, hs] of delHits) {
  if (okFiles.has(f)) continue;
  if (deadWithSource(f)) freed.push(f); else hits.push(...hs);
}
if (freed.length) console.log(`[gate-integrity] miễn ${freed.length} spec xóa nguyên cùng nguồn chết: ${freed.join(", ")}`);

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
