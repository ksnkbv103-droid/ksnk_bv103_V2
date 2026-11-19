import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * VST-042 (PO 19/11): dashboard bảng kiểm GSC gọi mức tuân thủ thấp là «dưới ngưỡng»
 * (ngưỡng 2 mức <85 đỏ · 85–<90 vàng · ≥90 xanh), không dùng chữ «mục tiêu».
 */
describe("GscBkAnalyticsDashboard — chữ «ngưỡng» (VST-042)", () => {
  const src = readFileSync(join(__dirname, "GscBkAnalyticsDashboard.tsx"), "utf8");

  it("không còn «dưới mục tiêu»", () => {
    expect(src).not.toContain("dưới mục tiêu");
  });

  it("có «dưới ngưỡng» ở dòng cảnh báo và mô tả việc theo dõi", () => {
    expect(src).toContain("Chỉ số dưới ngưỡng");
    expect(src).toContain("tuân thủ dưới ngưỡng");
  });
});
