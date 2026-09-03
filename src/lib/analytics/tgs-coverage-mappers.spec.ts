import { describe, expect, it } from "vitest";
import {
  buildTgsCoverageRow,
  buildTgsHitSet,
  computeTyLeBaoPhuTgs,
  resolveTgsBkCellStatus,
  TGS_BK_CELL_LABELS,
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
    const hits = Array.from({ length: 20 }, () => ({
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

  it("ô Không áp dụng / Thiếu tự giám sát / Đã tự giám sát", () => {
    expect(resolveTgsBkCellStatus({ appliesBatBuocTgs: false, hasHit: false })).toBe("khong_ap_dung");
    expect(resolveTgsBkCellStatus({ appliesBatBuocTgs: true, hasHit: false })).toBe("thieu_tgs");
    expect(resolveTgsBkCellStatus({ appliesBatBuocTgs: true, hasHit: true })).toBe("da_tgs");
    expect(TGS_BK_CELL_LABELS.khong_ap_dung).toBe("Không áp dụng");
    expect(TGS_BK_CELL_LABELS.thieu_tgs).toBe("Thiếu tự giám sát");
    expect(TGS_BK_CELL_LABELS.da_tgs).toBe("Đã tự giám sát");
  });
});
