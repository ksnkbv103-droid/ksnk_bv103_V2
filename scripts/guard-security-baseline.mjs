#!/usr/bin/env node
/**
 * guard-security-baseline — hai luật cơ học, không dùng AI:
 *  1. Bảng public mới trong supabase/migrations phải khai báo RLS tường minh
 *     (ENABLE ROW LEVEL SECURITY | CREATE POLICY | fn_sys_attach_admin_rls) trong migration nào đó.
 *     Trigger rls_auto_enable chỉ bật RLS, không tạo policy → không tính là đủ.
 *  2. Mọi hàm export trong file "use server" phải có bước kiểm quyền
 *     (trực tiếp, hoặc qua hàm cục bộ cùng file).
 *
 * Nợ cũ: scripts/data/security-baseline-allow.json (chỉ giảm, không tăng).
 *   node scripts/guard-security-baseline.mjs --write-baseline   # ghi lại nợ hiện tại
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIG_DIR = path.join(ROOT, "supabase", "migrations");
const SRC_DIR = path.join(ROOT, "src");
const BASELINE = path.join(ROOT, "scripts", "data", "security-baseline-allow.json");
const WRITE = process.argv.includes("--write-baseline");

// Dấu hiệu có kiểm quyền/định danh người gọi.
const AUTH_RE =
  /\b(?:ensure|require|assert|verify|check|authorize|authoriz)[A-Z]\w*\s*\(|\bgetActor\w*\s*\(|\bgetSessionUser\w*\s*\(|\bgetCurrent\w*\s*\(|\bresolve\w*(?:Scope|Actor|Viewer|Access)\w*\s*\(|\bauth\.getUser\s*\(|\bgetUser\s*\(|\bhasPermission\w*\s*\(|\bcan[A-Z]\w*\s*\(|\bwithAuth\w*\s*\(/;

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "archive_legacy" || e.name === "node_modules") continue;
      walk(full, test, out);
    } else if (test(e.name)) out.push(full);
  }
  return out;
}

const norm = (t) => t.replace(/"/g, "").replace(/^public\./i, "").toLowerCase();
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");

// ---------- 1. RLS ----------
function checkRls() {
  const files = walk(MIG_DIR, (n) => n.endsWith(".sql")).sort();
  const created = new Map(); // table -> file đầu tiên
  const dropped = new Set();
  const secured = new Set();
  const ident = `((?:"?public"?\\.)?"?[a-z0-9_]+"?)`;
  for (const f of files) {
    const sql = fs
      .readFileSync(f, "utf8")
      .replace(/--[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of sql.matchAll(new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${ident}`, "gi"))) {
      const t = norm(m[1]);
      if (t === "as") continue; // chuỗi 'CREATE TABLE AS' trong thân hàm
      if (!created.has(t)) created.set(t, rel(f));
      dropped.delete(t);
    }
    for (const m of sql.matchAll(new RegExp(`drop\\s+table\\s+(?:if\\s+exists\\s+)?${ident}`, "gi"))) dropped.add(norm(m[1]));
    for (const m of sql.matchAll(
      new RegExp(`alter\\s+table\\s+(?:only\\s+)?(?:if\\s+exists\\s+)?${ident}\\s+enable\\s+row\\s+level\\s+security`, "gi"),
    ))
      secured.add(norm(m[1]));
    for (const m of sql.matchAll(new RegExp(`create\\s+policy\\s+\\S+\\s+on\\s+${ident}`, "gi"))) secured.add(norm(m[1]));
    for (const m of sql.matchAll(/fn_sys_attach_admin_rls\s*\(\s*'([^']+)'/gi)) secured.add(norm(m[1]));
  }
  const bad = [];
  for (const t of created.keys()) {
    if (dropped.has(t) || secured.has(t)) continue;
    bad.push(`rls:${t}`);
  }
  return { bad, where: Object.fromEntries([...created].map(([t, f]) => [`rls:${t}`, f])) };
}

// ---------- 2. Server actions ----------
function splitExports(src) {
  // Cắt file thành các khối bắt đầu ở mỗi khai báo hàm cấp cao nhất.
  const re = /^(?:export\s+)?(?:default\s+)?(?:async\s+function\s+(\w+)|function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=]+)?=>)/gm;
  const marks = [];
  let m;
  while ((m = re.exec(src))) {
    const exported = /^export\b/.test(m[0]);
    const isFn = /async\s+function|function\s|=>/.test(m[0]);
    if (!isFn) continue;
    marks.push({ name: m[1] || m[2] || m[3], exported, at: m.index });
  }
  return marks.map((k, i) => ({ ...k, body: src.slice(k.at, i + 1 < marks.length ? marks[i + 1].at : src.length) }));
}

function checkActions() {
  const files = walk(SRC_DIR, (n) => /\.(ts|tsx)$/.test(n) && !/\.(spec|test)\./.test(n));
  const bad = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    if (!/^\s*["']use server["']/m.test(src.slice(0, 400))) continue;
    const blocks = splitExports(src);
    const authLocal = new Set(blocks.filter((b) => AUTH_RE.test(b.body)).map((b) => b.name));
    for (const b of blocks) {
      if (!b.exported) continue;
      if (AUTH_RE.test(b.body)) continue;
      const callsAuthLocal = [...authLocal].some((n) => n !== b.name && new RegExp(`\\b${n}\\s*\\(`).test(b.body));
      if (callsAuthLocal) continue;
      bad.push(`action:${rel(f)}#${b.name}`);
    }
  }
  return { bad };
}

// ---------- chạy ----------
const rls = checkRls();
const act = checkActions();
const all = [...rls.bad, ...act.bad].sort();

if (WRITE) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify({ note: "Nợ bảo mật cũ — chỉ được giảm. Sinh bởi guard-security-baseline --write-baseline.", allow: all }, null, 2) + "\n");
  console.log(`[guard-security-baseline] đã ghi baseline: ${all.length} mục (rls ${rls.bad.length}, action ${act.bad.length})`);
  process.exit(0);
}

const allow = new Set(fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).allow : []);
const fresh = all.filter((k) => !allow.has(k));
const fixed = [...allow].filter((k) => !all.includes(k));

if (fresh.length) {
  console.error(`[guard-security-baseline] FAIL: ${fresh.length} vi phạm mới`);
  for (const k of fresh) console.error(`  - ${k}${rls.where[k] ? `  (${rls.where[k]})` : ""}`);
  console.error("  Bảng mới: thêm ENABLE ROW LEVEL SECURITY + CREATE POLICY. Action: gọi ensure*/require*/getActor* trước khi truy cập dữ liệu.");
  process.exit(1);
}
console.log(`[guard-security-baseline] OK — nợ cũ còn ${all.length}/${allow.size}${fixed.length ? `, đã sửa ${fixed.length} (chạy --write-baseline để thu hẹp)` : ""}`);
