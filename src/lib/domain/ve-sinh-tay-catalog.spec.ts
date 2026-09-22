import { describe, expect, it } from "vitest";
import {
  filterOutWhoBangKiemRows,
  isVeSinhTayGscBangKiem,
  isWhoObservationBangKiem,
  pickVeSinhTayChecklistRates,
  resolveVeSinhTayBkMap,
  VE_SINH_TAY_BK_MAP,
  VE_SINH_TAY_CHUYEN_DE,
  VE_SINH_TAY_WHO,
} from "./ve-sinh-tay-catalog";

describe("ve-sinh-tay-catalog", () => {
  it("maps QT.07 BM.02/03 → BM.07.02/03 with chuyen_de", () => {
    expect(resolveVeSinhTayBkMap("KSNK.QT.07.BM.02")?.ma_bk).toBe("BM.07.02");
    expect(resolveVeSinhTayBkMap("bm.07.03")?.slot).toBe("BM03_NGOAI_KHOA");
    expect(VE_SINH_TAY_BK_MAP.every((m) => m.chuyen_de === VE_SINH_TAY_CHUYEN_DE)).toBe(true);
  });

  it("excludes WHO / BM.01 from GSC picker family", () => {
    expect(isWhoObservationBangKiem("BM.07.01")).toBe(true);
    expect(isWhoObservationBangKiem("VST_WHO")).toBe(true);
    expect(isWhoObservationBangKiem("KSNK.QT.07.BM.01")).toBe(true);
    expect(isWhoObservationBangKiem("BM.07.02")).toBe(false);
    expect(filterOutWhoBangKiemRows([{ ma_bk: "BM.07.01" }, { ma_bk: "BM.07.02" }])).toEqual([
      { ma_bk: "BM.07.02" },
    ]);
  });

  it("WHO entry points to VST form; BK to GSC deep-link", () => {
    expect(VE_SINH_TAY_WHO.formHref).toBe("/giam-sat-vst");
    expect(VE_SINH_TAY_BK_MAP[0]?.formHref).toContain("bk=BM.07.02");
    expect(isVeSinhTayGscBangKiem("BM.07.02")).toBe(true);
    expect(isVeSinhTayGscBangKiem("BM.08.01")).toBe(false);
  });

  it("picks checklist rates without averaging", () => {
    const rates = pickVeSinhTayChecklistRates([
      { ma_bk: "BM.07.02", ty_le_tuan_thu: 80, tong_quan_sat: 10, tong_dat: 8 },
      { ma_bk: "BM.08.01", ty_le_tuan_thu: 50, tong_quan_sat: 4, tong_dat: 2 },
    ]);
    expect(rates).toHaveLength(2);
    expect(rates[0]).toMatchObject({ ma_bk: "BM.07.02", ty_le_tuan_thu: 80, found: true });
    expect(rates[1]).toMatchObject({ ma_bk: "BM.07.03", ty_le_tuan_thu: null, found: false });
  });
});
