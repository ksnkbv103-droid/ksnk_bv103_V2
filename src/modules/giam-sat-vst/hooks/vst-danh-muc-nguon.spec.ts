import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * VST-041 (PO 19/11): nút «In phiếu» và dialog «Xem» VST lấy danh mục qua action của chính module
 * (cổng GIAM_SAT_VST:view), không qua getCategoriesByType (đòi DANH_MUC_ORG:view — không vai nào có).
 */
const HOOKS = ["use-vst-print.ts", "use-vst-history-table.ts"];

describe("hook in/xem VST — nguồn danh mục (VST-041)", () => {
  for (const f of HOOKS) {
    it(`${f}: không gọi getCategoriesByType, dùng getVstViewDanhMuc`, () => {
      const src = readFileSync(join(__dirname, f), "utf8");
      expect(src).not.toContain("categories-by-type");
      expect(src).toContain("getVstViewDanhMuc");
    });
  }
});
