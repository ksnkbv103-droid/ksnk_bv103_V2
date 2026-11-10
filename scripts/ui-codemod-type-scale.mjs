#!/usr/bin/env node
/**
 * Codemod thang chữ: `text-[11px]` → `text-xs` (12px) cho danh sách file truyền vào.
 * Bỏ qua in ấn, token/chrome, kit bv103 và lưới ngày/timeline dày (dễ tràn ô cố định).
 * Chạy: node scripts/ui-codemod-type-scale.mjs <file...> [--dry]
 * Kế hoạch: docs/ux/ui-redesign-plan.md (Rà toàn project).
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const files = args.filter((a) => !a.startsWith("--"));
const SKIP =
  /print|PrintView|PrintLayout|usePrint|DayGrid|Timeline|bv103-design-tokens|bv103-layout-chrome|globals\.css|components\/ui\/bv103\//i;

let total = 0;
for (const f of files) {
  if (SKIP.test(f)) {
    console.log(`bỏ qua  ${f}`);
    continue;
  }
  const src = readFileSync(f, "utf8");
  const n = (src.match(/text-\[11px\]/g) || []).length;
  if (!n) continue;
  total += n;
  console.log(`${String(n).padStart(4)}  ${f}`);
  if (!dry) writeFileSync(f, src.replace(/text-\[11px\]/g, "text-xs"));
}
console.log(`[type-scale] ${dry ? "sẽ đổi" : "đã đổi"} ${total} chỗ`);
