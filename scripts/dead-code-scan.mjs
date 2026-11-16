#!/usr/bin/env node
/**
 * Quét mã chết bằng TypeScript compiler API (thay `fallow`, không có trong package.json).
 * Chỉ đọc. Warn-only: thoát 0, trừ khi DEAD_CODE_STRICT=1 và còn file mồ côi / chỉ test / chết qua export.
 *
 *   node scripts/dead-code-scan.mjs [--root <thư mục>] [--json <file>]
 *
 * Định nghĩa (khớp docs plan KH_APPKSNK_20261116 §0):
 *  - mồ côi: file src không tới được từ entry lúc chạy, cũng không từ spec
 *  - chỉ test: không tới được từ entry lúc chạy, nhưng spec import
 *  - chết qua export: file có import nhưng mọi export (kể cả type) không ai dùng lúc chạy
 *  - export chết: export (không tính type) không ai dùng, kể cả trong chính file
 * Entry lúc chạy: file quy ước Next.js trong src/app, src/proxy|middleware|instrumentation,
 * mọi file ngoài src/ không phải test (scripts/, e2e/ không tính test, cấu hình gốc) và file được
 * nhắc bằng đường dẫn trong cấu hình gốc / package.json. Không thấy import ghép chuỗi → kiểm bằng git grep.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const args = process.argv.slice(2);
const argOf = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const ROOT = path.resolve(argOf("--root") ?? path.join(import.meta.dirname, ".."));
const JSON_OUT = argOf("--json");
const strict = process.env.DEAD_CODE_STRICT === "1";
const SRC = path.join(ROOT, "src");
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");

// Chỉ để in: file giữ có chủ đích. KHÔNG trừ khỏi số đếm.
const compatWhitelist = [
  "src/modules/cssd-erp/actions/cssd.actions.ts", // compat re-export — backend audit
  "src/components/ui/dialog.tsx", // by design: DialogPortal / DialogOverlay / DialogClose
  "src/components/ui/button.tsx", // shadcn — giữ dù đồ thị import không thấy
  "scripts/lib/resolve-local-supabase-env.mjs", // by design: hằng SUPABASE_LOCAL_*
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const srcFiles = walk(SRC).filter((f) => CODE.test(f));
const sideFiles = [...walk(path.join(ROOT, "scripts")), ...walk(path.join(ROOT, "e2e"))].filter((f) => CODE.test(f));
const rootCfg = fs.readdirSync(ROOT).filter((n) => CODE.test(n)).map((n) => path.join(ROOT, n));
const allFiles = [...srcFiles, ...sideFiles, ...rootCfg];
const fileSet = new Set(allFiles);

const isDts = (r) => r.endsWith(".d.ts");
const isTest = (r) => /\.(spec|test)\.[cm]?[tj]sx?$/.test(r) || r.startsWith("e2e/") || /(^|\/)__(tests|mocks)__\//.test(r);
const NEXT_ENTRY =
  /^src\/app\/(.*\/)?(page|layout|route|default|loading|error|not-found|global-error|template|manifest|robots|sitemap|icon|apple-icon|opengraph-image|twitter-image)\.(tsx|ts|jsx|js)$/;
const ROOT_ENTRY = /^src\/(middleware|proxy|instrumentation|instrumentation-client)\.(ts|js)$/;
const isFrameworkEntry = (r) => NEXT_ENTRY.test(r) || ROOT_ENTRY.test(r);
const isProdEntry = (r) => isFrameworkEntry(r) || (!r.startsWith("src/") && !isTest(r));

function modKey(r) {
  const p = r.split("/");
  if (p[0] !== "src") return p[0];
  if (p[1] === "modules") return p[2];
  return `src/${p[1]}`;
}

// ---------- phân giải import ----------
const EXT = [".ts", ".tsx", ".d.ts", ".mts", ".js", ".jsx", ".mjs", ".cjs"];
const resCache = new Map();
function resolveSpec(from, spec) {
  const key = `${path.dirname(from)}\0${spec}`;
  if (resCache.has(key)) return resCache.get(key);
  let base = null;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  let out = null;
  if (base) {
    const cands = [base, ...EXT.map((e) => base + e), ...EXT.map((e) => path.join(base, `index${e}`))];
    if (/\.(js|mjs|cjs)$/.test(base)) {
      const b = base.replace(/\.(js|mjs|cjs)$/, "");
      cands.push(`${b}.ts`, `${b}.tsx`);
    }
    for (const c of cands) if (fileSet.has(c)) { out = c; break; }
  }
  resCache.set(key, out);
  return out;
}

// ---------- đọc file ----------
function bindingNames(name) {
  if (ts.isIdentifier(name)) return [name.text];
  const out = [];
  for (const el of name.elements) if (!ts.isOmittedExpression(el)) out.push(...bindingNames(el.name));
  return out;
}
function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const kind = /\.(tsx|jsx)$/.test(file) ? ts.ScriptKind.TSX : /\.(js|mjs|cjs)$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const info = { file, r: rel(file), sf, loc: text.split("\n").length, imports: [], exports: new Map(), reexports: [] };
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const addExport = (name, local, node, isType, viaClause = false) => {
    if (!info.exports.has(name)) info.exports.set(name, { name, local, line: lineOf(node), isType: !!isType, viaClause });
  };
  const hasMod = (n, k) => (ts.canHaveModifiers(n) ? ts.getModifiers(n) : undefined)?.some((m) => m.kind === k);
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const imp = { spec: st.moduleSpecifier.text, names: [], ns: false, side: !st.importClause };
      const c = st.importClause;
      if (c) {
        if (c.name) imp.names.push("default");
        if (c.namedBindings) {
          if (ts.isNamespaceImport(c.namedBindings)) imp.ns = true;
          else for (const el of c.namedBindings.elements) imp.names.push((el.propertyName ?? el.name).text);
        }
      }
      info.imports.push(imp);
    } else if (ts.isImportEqualsDeclaration(st) && ts.isExternalModuleReference(st.moduleReference) && ts.isStringLiteral(st.moduleReference.expression)) {
      info.imports.push({ spec: st.moduleReference.expression.text, names: [], ns: true, side: false });
    } else if (ts.isExportDeclaration(st)) {
      if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
        const spec = st.moduleSpecifier.text;
        if (!st.exportClause) info.reexports.push({ spec, star: true });
        else if (ts.isNamespaceExport(st.exportClause)) {
          addExport(st.exportClause.name.text, null, st, false);
          info.imports.push({ spec, names: [], ns: true, side: false });
        } else {
          info.reexports.push({ spec, star: false, names: st.exportClause.elements.map((el) => ({ from: (el.propertyName ?? el.name).text, as: el.name.text })) });
        }
      } else if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) addExport(el.name.text, (el.propertyName ?? el.name).text, el, st.isTypeOnly || el.isTypeOnly, true);
      }
    } else if (ts.isExportAssignment(st)) {
      addExport("default", ts.isIdentifier(st.expression) ? st.expression.text : null, st, false, true);
    } else if (hasMod(st, ts.SyntaxKind.ExportKeyword)) {
      const def = hasMod(st, ts.SyntaxKind.DefaultKeyword);
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) for (const id of bindingNames(d.name)) addExport(id, id, d, false);
      } else if (st.name && ts.isIdentifier(st.name)) {
        addExport(def ? "default" : st.name.text, st.name.text, st, ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st));
      } else if (def) addExport("default", null, st, false);
    }
  }
  const visit = (n) => {
    if (ts.isCallExpression(n) && n.arguments.length && ts.isStringLiteralLike(n.arguments[0])) {
      const e = n.expression;
      const isDyn = e.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(e) && e.text === "require");
      const isMock =
        ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && /^(vi|jest)$/.test(e.expression.text) &&
        /^(mock|doMock|importActual|importMock|unmock)$/.test(e.name.text);
      if (isDyn || isMock) info.imports.push({ spec: n.arguments[0].text, names: [], ns: true, side: false });
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
      info.imports.push({ spec: n.argument.literal.text, names: [], ns: true, side: false });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return info;
}

const infos = new Map();
for (const f of allFiles) infos.set(f, parse(f));

// ---------- đồ thị ----------
const edges = new Map();
for (const info of infos.values()) {
  const set = new Set();
  for (const s of [...info.imports.map((i) => i.spec), ...info.reexports.map((x) => x.spec)]) {
    const t = resolveSpec(info.file, s);
    if (t) set.add(t);
  }
  edges.set(info.file, set);
}
// file được nhắc bằng chuỗi trong cấu hình gốc / package.json
const cfgProd = new Set();
const cfgTest = new Set();
for (const f of [...rootCfg, path.join(ROOT, "package.json")]) {
  if (!fs.existsSync(f)) continue;
  const text = fs.readFileSync(f, "utf8");
  const bucket = /(vitest|playwright)\.config/.test(f) ? cfgTest : cfgProd;
  for (const m of text.matchAll(/(?:^|[\s"'`=])((?:\.\/)?(?:src|scripts|e2e)\/[\w./\-[\]()@]+\.(?:ts|tsx|mts|js|mjs|cjs))/gm)) {
    const c = path.join(ROOT, m[1]);
    if (fileSet.has(c)) bucket.add(c);
  }
}
function reach(starts) {
  const seen = new Set(starts);
  const q = [...starts];
  while (q.length) {
    const f = q.pop();
    for (const t of edges.get(f) ?? []) if (!seen.has(t)) { seen.add(t); q.push(t); }
  }
  return seen;
}
const prodEntries = [...allFiles.filter((f) => isProdEntry(rel(f))), ...cfgProd];
const testEntries = [...allFiles.filter((f) => isTest(rel(f))), ...cfgTest];
const reachProd = reach(prodEntries);
const reachAny = reach([...prodEntries, ...testEntries]);

function exportUsage(importerSet) {
  const used = new Map();
  const all = new Set();
  const side = new Set();
  const mark = (file, name) => {
    const info = infos.get(file);
    if (!info) return;
    let s = used.get(file);
    if (!s) used.set(file, (s = new Set()));
    if (s.has(name)) return;
    s.add(name);
    let explicit = false;
    for (const re of info.reexports) {
      if (re.star) continue;
      for (const n of re.names) {
        if (n.as !== name) continue;
        explicit = true;
        const t = resolveSpec(file, re.spec);
        if (t) mark(t, n.from);
      }
    }
    if (!explicit && !info.exports.has(name) && name !== "default") {
      for (const re of info.reexports) {
        if (!re.star) continue;
        const t = resolveSpec(file, re.spec);
        if (t) mark(t, name);
      }
    }
  };
  const markAll = (file) => {
    if (all.has(file)) return;
    all.add(file);
    const info = infos.get(file);
    if (!info) return;
    for (const re of info.reexports) {
      const t = resolveSpec(file, re.spec);
      if (!t) continue;
      if (re.star) markAll(t);
      else for (const n of re.names) mark(t, n.from);
    }
  };
  for (const f of importerSet) {
    const info = infos.get(f);
    if (!info) continue;
    for (const imp of info.imports) {
      const t = resolveSpec(f, imp.spec);
      if (!t) continue;
      if (imp.ns) markAll(t);
      if (imp.side) side.add(t);
      for (const n of imp.names) mark(t, n);
    }
  }
  return { used, all, side };
}
const prodImporters = new Set([...reachProd].filter((f) => !isTest(rel(f))));
const uProd = exportUsage(prodImporters);
const uAny = exportUsage(reachAny);

function identCount(info, name) {
  let c = 0;
  const v = (n) => {
    if (ts.isIdentifier(n) && n.text === name) c++;
    ts.forEachChild(n, v);
  };
  v(info.sf);
  return c;
}

const orphans = [];
const testOnly = [];
const deadViaExports = [];
const deadExports = []; // chỉ export không type, không dùng ở đâu kể cả trong chính file
const testOnlyExports = [];
for (const f of srcFiles) {
  const info = infos.get(f);
  const r = info.r;
  if (isTest(r) || isDts(r)) continue;
  if (!reachProd.has(f)) {
    (reachAny.has(f) ? testOnly : orphans).push({ file: r, loc: info.loc, mod: modKey(r) });
    continue;
  }
  if (isFrameworkEntry(r)) continue;
  let nDead = 0;
  for (const e of info.exports.values()) {
    if (uProd.all.has(f) || uProd.used.get(f)?.has(e.name)) continue;
    const usedAny = uAny.all.has(f) || uAny.used.get(f)?.has(e.name);
    const internal = e.local ? identCount(info, e.local) - (e.viaClause ? 2 : 1) : 0;
    const cat = usedAny ? "chi-test" : internal > 0 ? "noi-bo" : "chet";
    if (cat !== "noi-bo") nDead++;
    if (e.isType) continue;
    if (cat === "chet") deadExports.push({ file: r, line: e.line, name: e.name, mod: modKey(r) });
    else if (cat === "chi-test") testOnlyExports.push({ file: r, line: e.line, name: e.name, mod: modKey(r) });
  }
  if (info.exports.size > 0 && nDead === info.exports.size && !uProd.side.has(f)) {
    deadViaExports.push({ file: r, loc: info.loc, mod: modKey(r), exports: info.exports.size });
  }
}
const byFile = (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0);
for (const l of [orphans, testOnly, deadViaExports, deadExports, testOnlyExports]) l.sort(byFile);

// ---------- in kết quả ----------
const sum = (l, k) => l.reduce((a, x) => a + x[k], 0);
const mods = new Map();
const M = (k) => { let m = mods.get(k); if (!m) mods.set(k, (m = { mod: k, files: 0, loc: 0, orphan: 0, testOnly: 0, deadVia: 0, exp: 0 })); return m; };
for (const f of srcFiles) {
  const info = infos.get(f);
  if (isTest(info.r) || isDts(info.r)) continue;
  const m = M(modKey(info.r));
  m.files++;
  m.loc += info.loc;
}
for (const o of orphans) M(o.mod).orphan++;
for (const o of testOnly) M(o.mod).testOnly++;
for (const o of deadViaExports) M(o.mod).deadVia++;
for (const e of deadExports) M(e.mod).exp++;

const result = {
  root: ROOT,
  counts: {
    files: sum([...mods.values()], "files"),
    loc: sum([...mods.values()], "loc"),
    orphans: orphans.length,
    testOnly: testOnly.length,
    deadViaExports: deadViaExports.length,
    deadExports: deadExports.length,
  },
  orphans, testOnly, deadViaExports, deadExports, testOnlyExports,
};
if (JSON_OUT) {
  fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 1));
}

const pad = (s, n) => String(s).padStart(n);
console.log("[dead-code:scan] TypeScript compiler API — chỉ đọc, warn-only.");
console.log(
  `[dead-code:scan] ${result.counts.files} file mã chạy / ${result.counts.loc} dòng · mồ côi ${orphans.length}/${sum(orphans, "loc")} · chỉ test ${testOnly.length}/${sum(testOnly, "loc")} · chết qua export ${deadViaExports.length}/${sum(deadViaExports, "loc")} · export chết (không type) ${deadExports.length} · export chỉ test (không type) ${testOnlyExports.length}`,
);
console.log(`[dead-code:scan] Whitelist (by design, chỉ in, không trừ khỏi số đếm): ${compatWhitelist.join(", ")}`);
console.log("[dead-code:scan] Theo đơn vị (file · dòng · mồ côi · chỉ test · chết qua export · export chết):");
for (const m of [...mods.values()].sort((a, b) => b.loc - a.loc)) {
  if (!m.orphan && !m.testOnly && !m.deadVia && !m.exp) continue;
  console.log(`  ${m.mod.padEnd(24)} ${pad(m.files, 4)} ${pad(m.loc, 6)} · ${pad(m.orphan, 2)} · ${pad(m.testOnly, 2)} · ${pad(m.deadVia, 2)} · ${pad(m.exp, 3)}`);
}
const section = (title, list, fmt) => {
  if (!list.length) return;
  console.log(`[dead-code:scan] ${title} (${list.length}):`);
  for (const x of list) console.log(`  - ${fmt(x)}`);
};
section("Mồ côi", orphans, (x) => `${x.file} (${x.loc} dòng)`);
section("Chỉ test", testOnly, (x) => `${x.file} (${x.loc} dòng)`);
section("Chết qua export", deadViaExports, (x) => `${x.file} (${x.loc} dòng, ${x.exports} export)`);
section("Export chết (không type)", deadExports, (x) => `${x.file}:${x.line} ${x.name}`);

const findings = orphans.length + testOnly.length + deadViaExports.length;
if (strict && findings > 0) {
  console.error(`[dead-code:scan] STRICT — ${findings} file mồ côi / chỉ test / chết qua export`);
  process.exit(1);
}
console.log("[dead-code:scan] Done.");
