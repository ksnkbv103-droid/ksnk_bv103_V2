#!/usr/bin/env node
/**
 * CSSD không import UI/components từ quan-tri-he-thong (MDM CRUD).
 * Cho phép: @/lib/*, actions vận hành qua facade cssd-catalog-ops.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanDirs = [
  path.join(root, "src", "modules", "cssd-erp"),
  path.join(root, "src", "app", "cssd-dung-cu"),
  path.join(root, "src", "app", "cssd-thiet-bi"),
  path.join(root, "src", "app", "cssd-quy-trinh"),
  path.join(root, "src", "app", "cssd-su-co"),
  path.join(root, "src", "app", "cssd-hoa-chat"),
  path.join(root, "src", "app", "cssd-erp"),
];

const forbidden = /@\/modules\/quan-tri-he-thong\/(danh-muc\/dung-cu\/[^"']+-form|danh-muc\/thiet-bi\/ThietBiMasterPage)/;
const violations = [];

const LEGACY_WHITELIST = [
  "src/modules/cssd-erp/hooks/use-cssd-catalog-page.ts",
  "src/modules/cssd-erp/views/CSSDCatalogQuickActions.tsx",
  "src/modules/cssd-erp/views/cssd-catalog-page-helpers.ts",
  "src/app/cssd-dung-cu/page.tsx",
  "src/app/cssd-thiet-bi/page.tsx"
];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) {
      const relPath = path.relative(root, p);
      if (LEGACY_WHITELIST.includes(relPath)) {
        continue;
      }
      const content = fs.readFileSync(p, "utf8");
      if (forbidden.test(content)) {
        violations.push(relPath);
      }
    }
  }
}

for (const d of scanDirs) walk(d);

if (violations.length) {
  console.error("=== imports:cssd-mdm FAILED ===");
  console.error("CSSD route/module must not import MDM form pages. Use read-only catalog + link to quan-tri.");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log("imports:cssd-mdm OK");
