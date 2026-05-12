#!/usr/bin/env node
/**
 * Kiểm tra nhanh: các route Trung tâm Danh mục còn file page.tsx (smoke cấu trúc, không cần dev server).
 * Chạy: node scripts/verify-trung-tam-danh-muc-routes.mjs
 */
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const app = path.join(root, "src", "app", "quan-tri-he-thong");

const routes = [
  "danh-muc/dung-cu/loai/page.tsx",
  "danh-muc/dung-cu/bo/page.tsx",
  "danh-muc/dung-cu/chi-tiet/page.tsx",
  "danh-muc/thiet-bi/page.tsx",
  "danh-muc/hoa-chat/page.tsx",
  "danh-muc/khoa-phong/page.tsx",
  "nhan-su/page.tsx",
  "bang-kiem/page.tsx",
];

let ok = 0;
for (const r of routes) {
  const full = path.join(app, r);
  try {
    await access(full);
    ok += 1;
  } catch {
    console.error(`[verify-danh-muc-routes] Thieu: ${r}`);
    process.exit(1);
  }
}
console.log(`[verify-danh-muc-routes] OK: ${ok}/${routes.length} trang ton tai.`);
