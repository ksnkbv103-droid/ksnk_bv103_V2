#!/usr/bin/env node
/**
 * Phân tích ảnh hưởng ngược trước khi sửa: «đổi X thì cái gì vỡ?».
 *
 *   node scripts/impact.mjs <file|bảng|view|function/RPC> [--all]
 *   node scripts/impact.mjs --cycles          # chu trình import trong src/modules
 *
 * (a) file TS/TSX import ngược tới đích (bắc cầu; re-export, import(), alias @/)
 * (b) đối tượng SQL tham chiếu tới đích theo TRẠNG THÁI CUỐI chuỗi migration
 *     + chỗ `.rpc('x')` / `.from('x')` trong TS
 * (c) test (*.spec|*.test, e2e) dính tới (a)/(b)
 * Nhãn: EXTRACTED = khớp cú pháp chắc chắn; [CẦN XÁC MINH] = chỉ khớp tên, chuỗi
 * động, POLICY/RLS — phải mở file kiểm tay.
 *
 * Regex SQL chép từ scripts/check-sql-object-refs.mjs (file đó không export;
 * sửa luật ở đó thì sửa cả ở đây). Không dùng package ngoài.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const t0 = Date.now();
const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const showAll = args.includes("--all");
const target = args.find((a) => !a.startsWith("--"));
const LIMIT = showAll ? Infinity : 25;

// ---------- TS graph ----------
const tsFiles = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "src", "e2e", "scripts"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && existsSync(join(root, f)));
const tsSet = new Set(tsFiles);
const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\sfrom\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;
const EXTS = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];

function resolveSpec(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = join("src", spec.slice(2));
  else if (spec.startsWith(".")) base = join(dirname(from), spec);
  else return null;
  for (const e of EXTS) {
    const p = base + e;
    if (tsSet.has(p)) return p;
  }
  return null;
}

const text = new Map();
const importers = new Map(); // file -> Set(file import nó)
const imports = new Map();
for (const f of tsFiles) {
  const s = readFileSync(join(root, f), "utf8");
  text.set(f, s);
  const out = new Set();
  for (const m of s.matchAll(IMPORT_RE)) {
    const r = resolveSpec(f, m[1] || m[2] || m[3]);
    if (r && r !== f) out.add(r);
  }
  imports.set(f, out);
  for (const r of out) {
    if (!importers.has(r)) importers.set(r, new Set());
    importers.get(r).add(f);
  }
}

/** BFS ngược: mọi file import (bắc cầu) tới một trong `seeds`. */
function reverseClosure(seeds) {
  const seen = new Map(); // file -> độ sâu
  const q = [...seeds].map((s) => [s, 0]);
  while (q.length) {
    const [f, d] = q.shift();
    for (const u of importers.get(f) || []) {
      if (seen.has(u) || seeds.has(u)) continue;
      seen.set(u, d + 1);
      q.push([u, d + 1]);
    }
  }
  return seen;
}

// ---------- --cycles ----------
if (args.includes("--cycles")) {
  const nodes = tsFiles.filter((f) => f.startsWith("src/modules/"));
  const ns = new Set(nodes);
  let idx = 0;
  const index = new Map(), low = new Map(), on = new Set(), st = [], sccs = [];
  const strong = (v) => {
    index.set(v, idx); low.set(v, idx++); st.push(v); on.add(v);
    for (const w of imports.get(v) || []) {
      if (!ns.has(w)) continue;
      if (!index.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const c = [];
      let w;
      do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v);
      if (c.length > 1) sccs.push(c);
    }
  };
  for (const v of nodes) if (!index.has(v)) strong(v);
  console.log(`[impact --cycles] ${sccs.length} chu trình import trong src/modules (${nodes.length} file, ${Date.now() - t0} ms)`);
  for (const c of sccs) console.log(`  - (${c.length}) ${c.slice(0, 6).join(" ↔ ")}${c.length > 6 ? " …" : ""}`);
  process.exit(0);
}

if (!target) {
  console.error("Dùng: node scripts/impact.mjs <file|bảng|view|function> [--all] | --cycles");
  process.exit(1);
}

// ---------- SQL final state ----------
const migDir = join(root, "supabase/migrations");
const migFiles = readdirSync(migDir).filter((n) => n.endsWith(".sql")).sort();
const DROP_REL_RE = /DROP\s+(?:MATERIALIZED\s+)?(?:TABLE|VIEW)\s+(?:IF\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const DROP_FN_RE = /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const CREATE_FN_RE = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const CREATE_VIEW_RE =
  /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const CREATE_TABLE_RE =
  /CREATE\s+(?:UNLOGGED\s+|FOREIGN\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const POLICY_RE = /CREATE\s+POLICY\s+(?:"([^"]+)"|([^\s"]+))\s+ON\s+"?public"?\.\s*"?([a-z0-9_]+)"?([\s\S]*?);/gi;
const DROP_POLICY_RE = /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?(?:"([^"]+)"|([^\s"]+))\s+ON\s+"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const TRIGGER_RE =
  /CREATE\s+(?:OR\s+REPLACE\s+)?(?:CONSTRAINT\s+)?TRIGGER\s+"?([a-z0-9_]+)"?[\s\S]*?ON\s+"?public"?\.\s*"?([a-z0-9_]+)"?[\s\S]*?EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+"?(?:public"?\.\s*"?)?([a-z0-9_]+)"?/gi;
const RENAME_RE =
  /ALTER\s+(TABLE|VIEW|MATERIALIZED\s+VIEW|FUNCTION)\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?"?public"?\.\s*"?([a-z0-9_]+)"?\s*(?:\([^)]*\)\s*)?RENAME\s+TO\s+"?([a-z0-9_]+)"?/gi;
const FK_RE = /REFERENCES\s+(?:"?public"?\.\s*)?"?([a-z0-9_]+)"?/gi;
const OWNER_TABLE_RE = /(?:CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?|ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?)"?public"?\.\s*"?([a-z0-9_]+)"?/gi;
const stripSqlComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, "");
const DROP_TRIGGER_RE = /DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?"?([a-z0-9_]+)"?\s+ON\s+"?public"?\.\s*"?([a-z0-9_]+)"?/gi;

function readDollarBody(s, start) {
  const open = /\$([a-z_]*)\$/i.exec(s.slice(start, start + 4000));
  if (!open) return null;
  const bodyStart = start + open.index + open[0].length;
  const bodyEnd = s.indexOf(open[0], bodyStart);
  return bodyEnd < 0 ? null : s.slice(bodyStart, bodyEnd);
}
const readViewBody = (s, start) => {
  const end = s.indexOf(";", start);
  return end < 0 ? s.slice(start) : s.slice(start, end);
};

/** key "fn:x" | "view:x" -> {body, file} ; tables, policies, triggers ở trạng thái cuối */
const defs = new Map();
const tables = new Map();
const policies = new Map(); // "tbl.policy" -> {body,file}
const triggers = new Map(); // "tbl.trg" -> {fn,file}
const fks = new Map(); // "from->to" -> file (FK: bảng from REFERENCES bảng to)
const renameKey = (map, a, b) => { if (map.has(a)) { map.set(b, map.get(a)); map.delete(a); } };
for (const name of migFiles) {
  const s = stripSqlComments(readFileSync(join(migDir, name), "utf8"));
  const owners = [...s.matchAll(OWNER_TABLE_RE)];
  for (const m of s.matchAll(FK_RE)) {
    const own = owners.filter((o) => o.index < m.index).pop();
    if (own && own[1].toLowerCase() !== m[1].toLowerCase()) fks.set(`${own[1].toLowerCase()}->${m[1].toLowerCase()}`, name);
  }
  for (const m of s.matchAll(CREATE_TABLE_RE)) tables.set(m[1].toLowerCase(), name);
  for (const m of s.matchAll(DROP_REL_RE)) {
    const r = m[1].toLowerCase();
    const recreated = new RegExp(
      `CREATE\\s+(?:OR\\s+REPLACE\\s+)?(?:MATERIALIZED\\s+)?(?:TABLE|VIEW)[^;]*?public"?\\.\\s*"?${r}"?\\b`, "i",
    ).test(s);
    if (!recreated) { tables.delete(r); defs.delete(`view:${r}`); }
  }
  for (const m of s.matchAll(DROP_FN_RE)) defs.delete(`fn:${m[1].toLowerCase()}`);
  for (const m of s.matchAll(CREATE_FN_RE)) {
    const body = readDollarBody(s, m.index + m[0].length);
    if (body) defs.set(`fn:${m[1].toLowerCase()}`, { body, file: name });
  }
  for (const m of s.matchAll(CREATE_VIEW_RE))
    defs.set(`view:${m[1].toLowerCase()}`, { body: readViewBody(s, m.index + m[0].length), file: name });
  for (const m of s.matchAll(DROP_POLICY_RE)) policies.delete(`${m[3].toLowerCase()}.${m[1] ?? m[2]}`);
  for (const m of s.matchAll(POLICY_RE)) policies.set(`${m[3].toLowerCase()}.${m[1] ?? m[2]}`, { body: m[4], file: name });
  for (const m of s.matchAll(DROP_TRIGGER_RE)) triggers.delete(`${m[2].toLowerCase()}.${m[1].toLowerCase()}`);
  for (const m of s.matchAll(TRIGGER_RE))
    triggers.set(`${m[2].toLowerCase()}.${m[1].toLowerCase()}`, { fn: m[3].toLowerCase(), file: name });
  for (const m of s.matchAll(RENAME_RE)) {
    const [a, b] = [m[2].toLowerCase(), m[3].toLowerCase()];
    if (/FUNCTION/i.test(m[1])) renameKey(defs, `fn:${a}`, `fn:${b}`);
    else {
      renameKey(tables, a, b); renameKey(defs, `view:${a}`, `view:${b}`);
      for (const map of [policies, triggers, fks])
        for (const k of [...map.keys()]) {
          const nk = k.startsWith(`${a}.`) ? `${b}.${k.slice(a.length + 1)}`
            : k.startsWith(`${a}->`) ? `${b}->${k.slice(a.length + 2)}`
            : k.endsWith(`->${a}`) ? `${k.slice(0, -a.length)}${b}` : null;
          if (nk) renameKey(map, k, nk);
        }
    }
  }
}

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Mức chắc chắn của tham chiếu tới `n` trong thân SQL. */
function sqlRefKind(body, n) {
  const e = esc(n);
  if (new RegExp(`(?:FROM|JOIN|INTO|UPDATE|DELETE\\s+FROM)\\s+(?:ONLY\\s+)?"?public"?\\.\\s*"?${e}"?\\b`, "i").test(body)) return "EXTRACTED";
  if (new RegExp(`\\bpublic"?\\.\\s*"?${e}"?\\s*\\(`, "i").test(body)) return "EXTRACTED";
  if (new RegExp(`(?:FROM|JOIN|INTO|UPDATE|DELETE\\s+FROM)\\s+"?${e}"?\\b`, "i").test(body)) return "EXTRACTED";
  if (new RegExp(`\\b${e}\\s*\\(`, "i").test(body)) return "EXTRACTED";
  if (new RegExp(`\\b${e}\\b`, "i").test(body)) return "[CẦN XÁC MINH]";
  return null;
}

// ---------- phân giải đích ----------
const isFile = target.includes("/") || /\.(tsx?|mjs|js)$/.test(target);
const edges = []; // {from, to, kind, label}
const tsSeeds = new Set();
const sqlTargets = new Set();

if (isFile) {
  const f = relative(root, resolve(process.cwd(), target));
  const rf = tsSet.has(f) ? f : tsSet.has(target) ? target : null;
  if (!rf) { console.error(`[impact] không thấy file trong git: ${target}`); process.exit(1); }
  tsSeeds.add(rf);
} else {
  const n = target.toLowerCase().replace(/^public\./, "");
  sqlTargets.add(n);
  const kind = defs.has(`fn:${n}`) ? "function" : defs.has(`view:${n}`) ? "view" : tables.has(n) ? "table" : null;
  console.log(`Đích: public.${n} (${kind ?? "KHÔNG THẤY ở trạng thái cuối migration — có thể đã DROP/đổi tên"})`);
  // (b) SQL: BFS qua function/view gọi/đọc đích
  const q = [n];
  const seen = new Set([n]);
  const weak = new Set(); // đối tượng chỉ khớp tên (không qua FROM/JOIN/gọi hàm)
  while (q.length) {
    const cur = q.shift();
    for (const [key, d] of defs) {
      const obj = key.slice(key.indexOf(":") + 1);
      if (seen.has(obj)) continue;
      const k = sqlRefKind(d.body, cur);
      if (!k) continue;
      edges.push({ from: `${key.replace(":", " ")}`, to: cur, label: k, where: d.file });
      seen.add(obj);
      sqlTargets.add(obj);
      if (k === "EXTRACTED") q.push(obj); else weak.add(obj);
    }
  }
  for (const [key, file] of fks) {
    const [from, to] = key.split("->");
    if (to === n && tables.has(from)) edges.push({ from: `table ${from} (FK)`, to: n, label: "EXTRACTED", where: file });
  }
  for (const [key, t] of triggers)
    if (sqlTargets.has(t.fn) || key.split(".")[0] === n)
      edges.push({ from: `trigger ${key}`, to: key.split(".")[0] === n ? n : t.fn, label: "EXTRACTED", where: t.file });
  for (const [key, p] of policies) {
    const tbl = key.split(".")[0];
    if (tbl === n) edges.push({ from: `policy ${key}`, to: n, label: "EXTRACTED", where: p.file });
    else if ([...sqlTargets].some((x) => new RegExp(`\\b${esc(x)}\\b`, "i").test(p.body)))
      edges.push({ from: `policy ${key}`, to: n, label: "[CẦN XÁC MINH]", where: p.file });
  }
  // TS: .rpc('x') / .from('x') / chuỗi trùng tên
  for (const [f, s] of text) {
    if (!f.startsWith("src/") && !f.startsWith("e2e/")) continue;
    for (const x of sqlTargets) {
      const e = esc(x);
      if (new RegExp(`\\.(?:rpc|from)\\(\\s*["'\`]${e}["'\`]`).test(s)) {
        edges.push({ from: f, to: x, label: weak.has(x) ? "[CẦN XÁC MINH]" : "EXTRACTED", where: ".rpc/.from" }); tsSeeds.add(f);
      } else if (new RegExp(`["'\`]${e}["'\`]`).test(s)) {
        edges.push({ from: f, to: x, label: "[CẦN XÁC MINH]", where: "chuỗi trùng tên" }); tsSeeds.add(f);
      }
    }
  }
}

// (a) TS importers bắc cầu
const rev = reverseClosure(tsSeeds);
const isTest = (f) => /\.(spec|test)\.(ts|tsx|mjs)$/.test(f) || f.startsWith("e2e/");
const allTs = new Set([...tsSeeds, ...rev.keys()]);
// test nhắc tên đích dù không quote/không import (vd. test đọc file migration)
const nameRes = [...sqlTargets].map((x) => new RegExp(`\\b${esc(x)}\\b`));
for (const [f, s] of text) if (isTest(f) && nameRes.some((r) => r.test(s))) allTs.add(f);
const tests = [...allTs].filter(isTest).sort();

const pr = (title, arr) => {
  console.log(`\n${title}: ${arr.length}`);
  for (const l of arr.slice(0, LIMIT)) console.log(`  - ${l}`);
  if (arr.length > LIMIT) console.log(`  … ${arr.length - LIMIT} dòng nữa (--all)`);
};
const sqlEdges = edges.filter((e) => !tsSet.has(e.from));
const tsEdges = edges.filter((e) => tsSet.has(e.from));
if (!isFile) {
  pr("(b) SQL tham chiếu (trạng thái cuối)", sqlEdges.map((e) => `${e.label} ${e.from} → ${e.to}  (${e.where})`));
  pr("(b) TS gọi trực tiếp", tsEdges.map((e) => `${e.label} ${e.from} → ${e.to}  (${e.where})`));
}
pr(
  "(a) TS import ngược (bắc cầu)",
  [...rev.entries()].filter(([f]) => !isTest(f)).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([f, d]) => `EXTRACTED d=${d} ${f}`),
);
pr("(c) Test liên quan", tests);
const unverified = edges.filter((e) => e.label !== "EXTRACTED").length;
console.log(`\n[impact] ${edges.length} cạnh trực tiếp (${unverified} [CẦN XÁC MINH]), ${rev.size} file import ngược, ${tests.length} test — ${Date.now() - t0} ms`);
