import { describe, expect, it } from "vitest";
import {
  formatNhiemVuKyHan,
  nhiemVuMatchesPeriod,
  nhiemVuMissingAdminFields,
  parseQuickNhiemVuInput,
  pctNamFromNhiemVuList,
} from "./ke-hoach-nam-format";

describe("ke-hoach-nam-format", () => {
  it("format kỳ Q·T hoặc hạn", () => {
    expect(formatNhiemVuKyHan({ quy: 2, thang: 6, han_hoan_thanh: null })).toBe("Q2·T6");
    expect(formatNhiemVuKyHan({ quy: null, thang: 3, han_hoan_thanh: null })).toBe("T3");
    expect(formatNhiemVuKyHan({ quy: null, thang: null, han_hoan_thanh: "2026-05-15" })).toBe("05-15");
    expect(formatNhiemVuKyHan({ quy: null, thang: null, han_hoan_thanh: null })).toBe("—");
  });

  it("cảnh báo thiếu cột hành chính", () => {
    expect(
      nhiemVuMissingAdminFields({
        pham_vi_ap_dung: null,
        chi_tieu: "x",
        chi_dao: null,
        bien_phap: "y",
        nguoi_chu_tri_id: null,
      }),
    ).toEqual(["phạm vi", "chỉ đạo", "người thực hiện"]);
  });

  it("lọc tháng/quý — nhiệm vụ cả năm luôn hiện", () => {
    const caNam = { quy: null, thang: null, trang_thai: "DANG_LAM" as const };
    const t3 = { quy: 1, thang: 3, trang_thai: "DANG_LAM" as const };
    const q2 = { quy: 2, thang: null, trang_thai: "DANG_LAM" as const };
    expect(nhiemVuMatchesPeriod(caNam, { kind: "THANG", value: 3 })).toBe(true);
    expect(nhiemVuMatchesPeriod(t3, { kind: "THANG", value: 3 })).toBe(true);
    expect(nhiemVuMatchesPeriod(t3, { kind: "THANG", value: 4 })).toBe(false);
    expect(nhiemVuMatchesPeriod(q2, { kind: "THANG", value: 5 })).toBe(true); // Q2 ⊃ T5
    expect(nhiemVuMatchesPeriod(q2, { kind: "THANG", value: 2 })).toBe(false);
    expect(nhiemVuMatchesPeriod(t3, { kind: "QUY", value: 1 })).toBe(true);
    expect(nhiemVuMatchesPeriod(t3, { kind: "QUY", value: 2 })).toBe(false);
    expect(nhiemVuMatchesPeriod(caNam, { kind: "NAM", value: 0 })).toBe(true);
  });

  it("parse | Q2 / | T3", () => {
    expect(parseQuickNhiemVuInput("Đào tạo VST | Q2")).toEqual({
      ten: "Đào tạo VST",
      quy: 2,
      thang: null,
    });
    expect(parseQuickNhiemVuInput("Giám sát | T3")).toEqual({
      ten: "Giám sát",
      quy: 1,
      thang: 3,
    });
    expect(parseQuickNhiemVuInput("Chỉ tên")).toEqual({
      ten: "Chỉ tên",
      quy: null,
      thang: null,
    });
  });

  it("% năm = TB nhiệm vụ active", () => {
    expect(
      pctNamFromNhiemVuList([
        { pct: 100, trang_thai: "DANG_LAM", is_active: true },
        { pct: 50, trang_thai: "DANG_LAM", is_active: true },
        { pct: 0, trang_thai: "HUY", is_active: true },
      ]),
    ).toEqual({ pct: 75, nhiemVuCount: 2 });
  });
});
