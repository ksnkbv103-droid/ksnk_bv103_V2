import { describe, expect, it } from "vitest";
import {
  DEFAULT_HAN_CHUNG_CHI_THANG,
  labelChungChiKind,
  parseHanChungChiThang,
  resolveChungChi,
} from "./chung-chi";

describe("dao-tao chứng chỉ", () => {
  it("mặc định 12 tháng khi gan thiếu hoặc lệch", () => {
    expect(parseHanChungChiThang(null)).toBe(DEFAULT_HAN_CHUNG_CHI_THANG);
    expect(parseHanChungChiThang({ khoa_ids: [] })).toBe(12);
    expect(parseHanChungChiThang({ han_chung_chi_thang: 24 })).toBe(24);
    expect(parseHanChungChiThang({ han_chung_chi_thang: 0 })).toBe(12);
    expect(parseHanChungChiThang({ han_chung_chi_thang: 99 })).toBe(12);
  });

  it("thi đạt còn hạn / sắp hết / hết hạn theo ngày nộp", () => {
    const datLuc = "2025-08-26T00:00:00.000Z";
    expect(
      resolveChungChi({
        lastPassNopLuc: datLuc,
        lastPassKyTen: "Kỳ 1",
        hanThang: 12,
        nowIso: "2025-09-01T00:00:00.000Z",
      }).kind,
    ).toBe("con_han");
    expect(
      resolveChungChi({
        lastPassNopLuc: datLuc,
        lastPassKyTen: "Kỳ 1",
        hanThang: 12,
        nowIso: "2026-08-10T00:00:00.000Z",
      }).kind,
    ).toBe("sap_het_han");
    expect(
      resolveChungChi({
        lastPassNopLuc: datLuc,
        lastPassKyTen: "Kỳ 1",
        hanThang: 12,
        nowIso: "2026-09-01T00:00:00.000Z",
      }).kind,
    ).toBe("het_han");
  });

  it("chưa đạt / chưa nộp thì chưa có chứng chỉ", () => {
    expect(
      resolveChungChi({
        lastPassNopLuc: null,
        lastPassKyTen: null,
        hanThang: 12,
        nowIso: "2026-08-26T00:00:00.000Z",
      }).kind,
    ).toBe("chua_co");
    expect(labelChungChiKind("het_han")).toMatch(/Hết hạn/);
  });
});
