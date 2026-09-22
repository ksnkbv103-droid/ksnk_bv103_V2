import { describe, expect, it } from "vitest";
import { buildVeSinhTayKpiCards } from "./ve-sinh-tay-kpi";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";

function minimalVst(over: Partial<VstStrategicPayload["kpis"]> = {}): VstStrategicPayload {
  return {
    kpis: {
      tong_phien: 1,
      tong_co_hoi: 10,
      da_tuan_thu: 8,
      ty_le_tuan_thu: 80,
      ty_le_dung_ky_thuat: 0,
      ty_le_lam_dung_gang: 0,
      ...over,
    },
    trendline: [],
    matrix_khoa: [],
    matrix_nghe: [],
    moments: [],
    gap_analysis: [],
    workload: {
      khoa_tu_giam_sat: 0,
      khoa_duoc_ksnk_giam_sat: 0,
      ksnk_so_phien: 0,
      co_cau_giam_sat: [],
    },
  } as VstStrategicPayload;
}

function minimalGsc(): GscStrategicPayload {
  return {
    kpis: { tong_phien: 3, tong_quan_sat: 20, tong_dat: 15, tong_vi_pham: 5, ty_le_tuan_thu: 75 },
    trendline: [],
    matrix_khoa: [],
    top_violations: [],
    gap_analysis: [],
    dynamic_checklists: [
      {
        ma_bk: "BM.07.02",
        ten_bang_kiem: "VST TQ",
        tong_phien: 2,
        tong_quan_sat: 10,
        tong_dat: 9,
        tong_vi_pham: 1,
        ty_le_tuan_thu: 90,
      },
      {
        ma_bk: "BM.08.01",
        ten_bang_kiem: "PPE",
        tong_phien: 1,
        tong_quan_sat: 10,
        tong_dat: 6,
        tong_vi_pham: 4,
        ty_le_tuan_thu: 60,
      },
    ],
    workload: {
      khoa_tu_giam_sat: 0,
      khoa_duoc_ksnk_giam_sat: 0,
      chuyen_de_duoc_ksnk_phu: 0,
      ksnk_so_phien: 0,
      co_cau_giam_sat: [],
    },
  };
}

describe("buildVeSinhTayKpiCards", () => {
  it("returns 3 cards without merging percents", () => {
    const cards = buildVeSinhTayKpiCards({ vst: minimalVst(), gsc: minimalGsc() });
    expect(cards).toHaveLength(3);
    expect(cards[0]!.tyLe).toBe(80);
    expect(cards[1]!.catalogMaBk).toBe("BM.07.02");
    expect(cards[1]!.tyLe).toBe(90);
    expect(cards[2]!.catalogMaBk).toBe("BM.07.03");
    expect(cards[2]!.tyLe).toBeNull();
    expect(cards[1]!.statsHref).toContain("bk=BM.07.02");
  });

  it("handles missing payloads", () => {
    const cards = buildVeSinhTayKpiCards({ vst: null, gsc: null });
    expect(cards.every((c) => c.tyLe == null)).toBe(true);
  });
});
