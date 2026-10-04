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

describe("báo cáo mẻ tiệt khuẩn không cắt im", () => {
  it("đọc trang range cùng cửa sổ ngày VN ±1, không limit 8000", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/cssd-erp/actions/cssd-report-read.actions.ts"),
      "utf8",
    );
    const idx = src.indexOf('.from("cssd_fact_lo_tiet_khuan")');
    expect(idx).toBeGreaterThan(-1);
    const head = src.slice(idx, src.indexOf("supabase.from(", idx));
    expect(head).toContain(".range(");
    expect(head).toContain("mePeriodWindowFilter");
    expect(head).not.toContain(".limit(");
    expect(src).not.toContain("MAX_REPORT_ROWS");
    expect(src).toContain("cssdVnDay(m.thoi_gian_bat_dau) || cssdVnDay(m.created_at)");
    expect(src).not.toContain("setUTCDate");
  });
});

describe("báo cáo bộ theo khoa không cắt im", () => {
  it("đọc hết bộ active, không limit 5000", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/cssd-erp/actions/cssd-report-read.actions.ts"),
      "utf8",
    );
    const idx = src.indexOf('.from("cssd_dm_bo_dung_cu")');
    expect(idx).toBeGreaterThan(-1);
    const head = src.slice(idx, src.indexOf("fetchAllReportRows<", idx));
    expect(head).toContain(".range(");
    expect(head).toContain('.eq("is_active", true)');
    expect(head).not.toContain(".limit(");
    expect(src).not.toContain(".limit(5000)");
  });
});
