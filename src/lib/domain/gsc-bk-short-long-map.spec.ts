import { describe, expect, it } from "vitest";
import {
  canonicalizeBangKiemMaForStats,
  mergeBkStatRowsByTopic,
  resolveBangKiemGroupMas,
  type BkStatRow,
} from "./gsc-bk-short-long-map";

describe("gsc-bk-short-long-map GSC-02/VST-04", () => {
  it("canonicalizes short → dài", () => {
    expect(canonicalizeBangKiemMaForStats("BM.26.01")).toBe("KSNK.QT.32.BM.01");
    expect(canonicalizeBangKiemMaForStats("KSNK.QT.32.BM.01")).toBe("KSNK.QT.32.BM.01");
  });

  it("nhật ký MEC/BSC không map sang QT.19 / QĐ.20", () => {
    expect(canonicalizeBangKiemMaForStats("BM.19.02")).toBe("BM.19.02");
    expect(canonicalizeBangKiemMaForStats("BM.QĐ.17.01")).toBe("BM.QĐ.17.01");
  });

  it("cùng chủ đề 2 mã → 1 dòng báo cáo", () => {
    const merged = mergeBkStatRowsByTopic<BkStatRow>([
      { ma_bk: "BM.26.01", tong_phien: 2, tong_quan_sat: 10, tong_dat: 8, tong_vi_pham: 2 },
      { ma_bk: "KSNK.QT.32.BM.01", tong_phien: 3, tong_quan_sat: 20, tong_dat: 10, tong_vi_pham: 10 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].ma_bk).toBe("KSNK.QT.32.BM.01");
    expect(merged[0].tong_phien).toBe(5);
    expect(merged[0].tong_quan_sat).toBe(30);
    expect(merged[0].tong_dat).toBe(18);
    expect(merged[0].ty_le_tuan_thu).toBe(60);
  });

  it("nhóm alias BM.03 gồm short + dài", () => {
    const g = resolveBangKiemGroupMas("BM.07.03");
    expect(g).toEqual(expect.arrayContaining(["BM.07.03", "KSNK.QT.07.BM.03"]));
  });
});
