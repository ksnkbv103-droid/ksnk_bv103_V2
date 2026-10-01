import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("báo cáo sự cố không cắt im", () => {
  it("cả nhật ký và KPI sự cố đọc trang range, không limit 8000", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/cssd-erp/actions/cssd-report-read.actions.ts"),
      "utf8",
    );
    const parts = src.split('.from("v_cssd_su_co_full")');
    expect(parts.length).toBe(3);
    for (const part of parts.slice(1)) {
      const head = part.slice(0, 280);
      expect(head).toContain(".range(");
      expect(head).not.toContain("MAX_REPORT_ROWS");
    }
  });
});
