#!/usr/bin/env node
/**
 * Tái sinh phần "Auto catalog" trong docs/wiki/index.md từ filesystem.
 * Chạy: npm run wiki:index
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const indexPath = path.join(docsDir, "wiki", "index.md");
const MARKER_START = "<!-- AUTO_CATALOG_START -->";
const MARKER_END = "<!-- AUTO_CATALOG_END -->";

const SKIP_DIRS = new Set(["wiki", "sources", ".git"]);
const TIER_ORDER = [
  ["core", "Core SSOT"],
  ["modules", "Modules"],
  ["reference", "Reference"],
  ["data", "Data (machine)"],
  ["archive", "Archive"],
  ["specs", "Specs"],
];

function listMdFiles(dir, base = "docs") {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, ent.name);
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      out.push(...listMdFiles(full, rel));
    } else if (ent.name.endsWith(".md")) {
      out.push(rel.replace(/\\/g, "/"));
    }
  }
  return out.sort();
}

function tierOf(rel) {
  const parts = rel.split("/");
  if (parts[0] !== "docs") return "other";
  return parts[1] ?? "other";
}

function oneLiner(filePath) {
  try {
    const text = fs.readFileSync(path.join(root, filePath), "utf8");
    const title = text.match(/^#\s+(.+)$/m);
    if (title) return title[1].trim().slice(0, 120);
    const blockquote = text.match(/^>\s*\*\*(.+?)\*\*/m);
    if (blockquote) return blockquote[1].trim().slice(0, 120);
  } catch {
    /* ignore */
  }
  return "—";
}

const all = listMdFiles(docsDir);
const byTier = new Map();
for (const f of all) {
  const t = tierOf(f);
  if (!byTier.has(t)) byTier.set(t, []);
  byTier.get(t).push(f);
}

let auto = `${MARKER_START}\n\n_Generated ${new Date().toISOString().slice(0, 10)} — \`npm run wiki:index\`_\n\n`;

for (const [dir, label] of TIER_ORDER) {
  const files = byTier.get(dir);
  if (!files?.length) continue;
  auto += `### ${label}\n\n`;
  for (const f of files) {
    const link = f.replace(/^docs\//, "../");
    auto += `- [\`${f}\`](${link}) — ${oneLiner(f)}\n`;
  }
  auto += "\n";
}

const other = [...byTier.keys()].filter(
  (k) => !TIER_ORDER.some(([d]) => d === k) && k !== "other",
);
if (other.length) {
  auto += `### Other\n\n`;
  for (const k of other) {
    for (const f of byTier.get(k) ?? []) {
      auto += `- [\`${f}\`](${f.replace(/^docs\//, "../")}) — ${oneLiner(f)}\n`;
    }
  }
  auto += "\n";
}

auto += MARKER_END;

let index = fs.readFileSync(indexPath, "utf8");
if (index.includes(MARKER_START)) {
  index = index.replace(
    new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`),
    auto.trimEnd(),
  );
} else {
  index += `\n\n${auto}\n`;
}
fs.writeFileSync(indexPath, index);
console.log(`wiki:index OK — ${all.length} files cataloged`);
