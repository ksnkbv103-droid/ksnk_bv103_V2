import { describe, expect, it } from "vitest";
import {
  findVeSinhTayEntryByCatalogMa,
  filterOutWhoBangKiemRows,
  gscHrefForVeSinhTayBk,
  isVeSinhTayGscBangKiem,
  isWhoObservationBangKiem,
  resolveBangKiemMaCandidates,
  VE_SINH_TAY_ENTRIES,
  VE_SINH_TAY_GSC_MA_BK,
  VE_SINH_TAY_MA_BK_ALIASES,
} from "./ve-sinh-tay-catalog";

describe("ve-sinh-tay-catalog", () => {
  it("exposes exactly 3 entries — WHO + BM.02 + BM.03 (prod long ma_bk)", () => {
    expect(VE_SINH_TAY_ENTRIES).toHaveLength(3);
    expect(VE_SINH_TAY_ENTRIES.map((e) => e.qtMa)).toEqual(["BM.01", "BM.02", "BM.03"]);
    expect(VE_SINH_TAY_ENTRIES[0]!.kind).toBe("who");
    expect(VE_SINH_TAY_ENTRIES[0]!.href).toBe("/giam-sat-vst");
    expect(VE_SINH_TAY_ENTRIES[0]!.catalogMaBk).toBeNull();
  });

  it("maps QT BM.02/BM.03 to prod long catalog codes", () => {
    expect(VE_SINH_TAY_GSC_MA_BK).toEqual(["KSNK.QT.07.BM.02", "KSNK.QT.07.BM.03"]);
    expect(VE_SINH_TAY_ENTRIES[1]!.href).toContain("bk=KSNK.QT.07.BM.02");
    expect(VE_SINH_TAY_ENTRIES[2]!.href).toContain("bk=KSNK.QT.07.BM.03");
  });

  it("SSOT aliases BM.07 ↔ KSNK.QT.07 bidirectional", () => {
    expect(VE_SINH_TAY_MA_BK_ALIASES).toEqual([
      ["BM.07.02", "KSNK.QT.07.BM.02"],
      ["BM.07.03", "KSNK.QT.07.BM.03"],
    ]);
    expect(resolveBangKiemMaCandidates("BM.07.02")).toEqual([
      "BM.07.02",
      "KSNK.QT.07.BM.02",
    ]);
    expect(resolveBangKiemMaCandidates("ksnk.qt.07.bm.03")).toEqual([
      "KSNK.QT.07.BM.03",
      "BM.07.03",
    ]);
    expect(resolveBangKiemMaCandidates("BM.08.01")).toEqual(["BM.08.01"]);
    expect(resolveBangKiemMaCandidates("  ")).toEqual([]);
  });

  it("builds GSC preselect href and finds by short or long catalog ma", () => {
    expect(gscHrefForVeSinhTayBk("KSNK.QT.07.BM.02")).toBe(
      "/giam-sat-chung/tuan-thu?bk=KSNK.QT.07.BM.02",
    );
    expect(findVeSinhTayEntryByCatalogMa("bm.07.03")?.qtMa).toBe("BM.03");
    expect(findVeSinhTayEntryByCatalogMa("KSNK.QT.07.BM.02")?.qtMa).toBe("BM.02");
    expect(findVeSinhTayEntryByCatalogMa("BM.99")).toBeUndefined();
  });

  it("isVeSinhTayGscBangKiem accepts short and long form", () => {
    expect(isVeSinhTayGscBangKiem("BM.07.02")).toBe(true);
    expect(isVeSinhTayGscBangKiem("KSNK.QT.07.BM.03")).toBe(true);
    expect(isVeSinhTayGscBangKiem("BM.07.01")).toBe(false);
    expect(isVeSinhTayGscBangKiem("BM.08.01")).toBe(false);
  });

  it("excludes WHO / BM.01 from GSC picker rows", () => {
    expect(isWhoObservationBangKiem("BM.07.01")).toBe(true);
    expect(isWhoObservationBangKiem("VST_WHO")).toBe(true);
    expect(isWhoObservationBangKiem("BM.07.02")).toBe(false);
    const rows = filterOutWhoBangKiemRows([
      { ma_bk: "BM.07.01" },
      { ma_bk: "BM.07.02" },
      { ma_bk: "KSNK.QT.07.BM.03" },
    ]);
    expect(rows.map((r) => r.ma_bk)).toEqual(["BM.07.02", "KSNK.QT.07.BM.03"]);
  });
});
