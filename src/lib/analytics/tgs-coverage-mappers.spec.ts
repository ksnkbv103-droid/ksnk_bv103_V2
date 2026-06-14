import { describe, expect, it } from "vitest";
import {
  buildTgsCoverageRow,
  buildTgsHitSet,
  computeTyLeBaoPhuTgs,
  listObligationMatrixColumns,
  obligationCellStatus,
} from "./tgs-coverage-mappers";

const khoa = { id: "k1", khoi_id: "kh1", ma_khoa: "NGOAI", ten_khoa: "Khoa Ngoại", is_active: true };

const catalog = Array.from({ length: 10 }, (_, i) => ({
  id: `b${i + 1}`,
  ma_bk: `BM.${i + 1}`,
  is_active: true,
  ap_dung_jsonb: {
    pham_vi: "CA_VIEN",
    khoi_ids: [],
    khoa_ids: [],
    khoa_loai_tru: [],
    bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
    muc_do: "BAT_BUOC",
  },
}));

describe("tgs-coverage-mappers", () => {
  it("breadth: 1 BK ×20 phiên vẫn chỉ 10%", () => {
    const hits = Array.from({ length: 20 }, (_, i) => ({
      khoa_id: "k1",
      bang_kiem_id: "b1",
    }));
    const row = buildTgsCoverageRow({
      khoa,
      catalog,
      hitSet: buildTgsHitSet(hits),
      tong_phien_tgs: 20,
    });
    expect(row.so_bk_bat_buoc).toBe(10);
    expect(row.so_bk_da_tgs).toBe(1);
    expect(row.ty_le_bao_phu_tgs).toBe(10);
  });

  it("computeTyLeBaoPhuTgs", () => {
    expect(computeTyLeBaoPhuTgs(1, 10)).toBe(10);
    expect(computeTyLeBaoPhuTgs(0, 0)).toBe(100);
  });

  it("ma trận chỉ cột BK bắt buộc TGS (không CHI_KSNK-only)", () => {
    const cols = listObligationMatrixColumns([
      catalog[0],
      {
        id: "bx",
        ma_bk: "BM.X",
        is_active: true,
        ap_dung_jsonb: {
          pham_vi: "CHI_KSNK",
          khoi_ids: [],
          khoa_ids: [],
          khoa_loai_tru: [],
          bat_buoc: { tu_giam_sat: false, ksnk_giam_sat: true },
          muc_do: "BAT_BUOC",
        },
      },
    ]);
    expect(cols.map((c) => c.id)).toEqual(["b1"]);
  });

  it("obligationCellStatus N/A vs thiếu", () => {
    const bkBatBuoc = catalog[0];
    const bkChiKsnk = {
      id: "bx",
      is_active: true,
      ap_dung_jsonb: {
        pham_vi: "CHI_KSNK",
        khoi_ids: [],
        khoa_ids: [],
        khoa_loai_tru: [],
        bat_buoc: { tu_giam_sat: false, ksnk_giam_sat: true },
        muc_do: "BAT_BUOC",
      },
    };
    const empty = new Set<string>();
    expect(obligationCellStatus(bkBatBuoc, khoa, empty)).toBe("missing_tgs");
    expect(obligationCellStatus(bkChiKsnk, khoa, empty)).toBe("not_applicable");
    expect(obligationCellStatus(bkBatBuoc, khoa, new Set(["k1|b1"]))).toBe("has_tgs");
  });
});
