#!/usr/bin/env node
/**
 * Kiểm tra link markdown tới file .md/.mdc.
 * Bỏ qua docs/archive và docs/data (cửa CLAUDE.md — không đọc kho).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = [
  path.join(root, "docs"),
  path.join(root, ".cursor", "rules"),
  path.join(root, "AGENTS.md"),
  path.join(root, "CLAUDE.md"),
  path.join(root, "README.md"),
  path.join(root, "supabase", "migrations", "README.md"),
];

const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
const missing = [];

function existsTarget(fromFile, target) {
  if (!target || target.startsWith("http") || target.startsWith("file:") || target.startsWith("#")) {
    return true;
  }
  const clean = target.split("#")[0].trim();
  if (!clean || clean.endsWith("/")) return true;
  const base = fromFile.endsWith(".md") || fromFile.endsWith(".mdc")
    ? path.dirname(fromFile)
    : root;
  const resolved = path.normalize(path.join(base, clean));
  if (!resolved.startsWith(root)) return true;
  return fs.existsSync(resolved);
}

function walk(file) {
  const content = fs.readFileSync(file, "utf8");
  let m;
  while ((m = linkRe.exec(content))) {
    const href = m[1];
    if (!existsTarget(file, href)) {
      missing.push({ file: path.relative(root, file), href });
    }
  }
}

function isClosedTree(dir) {
  const rel = path.relative(root, dir);
  return rel === path.join("docs", "data")
    || rel.startsWith(`${path.join("docs", "data")}${path.sep}`)
    || rel === path.join("docs", "archive")
    || rel.startsWith(`${path.join("docs", "archive")}${path.sep}`);
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  if (isClosedTree(dir)) return;
  if (fs.statSync(dir).isFile()) {
    if (dir.endsWith(".md") || dir.endsWith(".mdc")) walk(dir);
    return;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(full);
    else if (ent.name.endsWith(".md") || ent.name.endsWith(".mdc")) walk(full);
  }
}

for (const r of scanRoots) walkDir(r);

if (missing.length) {
  console.error("=== docs:links:check FAILED ===");
  for (const { file, href } of missing) {
    console.error(`  ${file} → ${href}`);
  }
  process.exit(1);
}
console.log("docs:links:check OK");
