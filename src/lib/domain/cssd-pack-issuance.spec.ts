import { describe, expect, it } from "vitest";
import {
  assertPackIssuable,
  isSterilePackExpired,
  isWetOrDamagedPackTinhTrang,
} from "./cssd-pack-issuance";
import { todayYmdInVn } from "@/lib/format-datetime-vi";

describe("cssd-pack-issuance", () => {

  it("defaults expiry today to VN calendar (not UTC slice)", () => {
    // 2026-09-03 17:30Z = 2026-09-04 00:30+07 — UTC slice would be 2026-09-03
    const edge = new Date("2026-09-03T17:30:00.000Z");
    const vnToday = todayYmdInVn(edge);
    expect(vnToday).toBe("2026-09-04");
    expect(isSterilePackExpired("2026-09-03", vnToday)).toBe(true);
    expect(isSterilePackExpired("2026-09-04", vnToday)).toBe(false);
  });

  it("detects expired by HSD", () => {
    expect(isSterilePackExpired("2026-01-01", "2026-09-04")).toBe(true);
    expect(isSterilePackExpired("2026-09-04", "2026-09-04")).toBe(false);
    expect(isSterilePackExpired("2026-12-01", "2026-09-04")).toBe(false);
  });

  it("detects wet / torn tinh_trang", () => {
    expect(isWetOrDamagedPackTinhTrang("GOI_UOT")).toBe(true);
    expect(isWetOrDamagedPackTinhTrang("ướt")).toBe(true);
    expect(isWetOrDamagedPackTinhTrang("RACH")).toBe(true);
    expect(isWetOrDamagedPackTinhTrang(null)).toBe(false);
  });

  it("blocks wet pack on issue", () => {
    const r = assertPackIssuable({
      tinh_trang: "UOT",
      han_su_dung: "2026-12-01",
      todayYmd: "2026-09-04",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/ướt|bẩn/i);
  });

  it("blocks expired pack on issue", () => {
    const r = assertPackIssuable({
      tinh_trang: "BINH_THUONG",
      han_su_dung: "2025-12-01",
      todayYmd: "2026-09-04",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/quá hạn/i);
  });

  it("blocks missing tinh_trang (no silent pass)", () => {
    const r = assertPackIssuable({
      han_su_dung: "2026-12-01",
      tinh_trang: null,
      todayYmd: "2026-09-04",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/thiếu tình trạng|tinh_trang/i);
  });

  it("blocks missing HSD (no silent pass)", () => {
    const r = assertPackIssuable({
      tinh_trang: "BINH_THUONG",
      han_su_dung: null,
      ngay_het_han: null,
      todayYmd: "2026-09-04",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/thiếu hạn sử dụng|HSD/i);
  });

  it("blocks invalid HSD format", () => {
    const r = assertPackIssuable({
      tinh_trang: "BINH_THUONG",
      han_su_dung: "không-phải-ngày",
      todayYmd: "2026-09-04",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/thiếu hạn sử dụng|HSD/i);
  });

  it("allows clean in-date pack with tinh_trang + HSD", () => {
    expect(
      assertPackIssuable({
        han_su_dung: "2026-12-01",
        tinh_trang: "BINH_THUONG",
        todayYmd: "2026-09-04",
      }).ok,
    ).toBe(true);
  });

  it("blocks red alert", () => {
    const r = assertPackIssuable({ is_red_alert: true });
    expect(r.ok).toBe(false);
  });

  it("blocks HONG / MAT", () => {
    expect(assertPackIssuable({ tinh_trang: "HONG", han_su_dung: "2026-12-01" }).ok).toBe(false);
    expect(assertPackIssuable({ tinh_trang: "MAT", han_su_dung: "2026-12-01" }).ok).toBe(false);
  });
});
