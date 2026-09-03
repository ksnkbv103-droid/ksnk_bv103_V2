import { describe, expect, it } from "vitest";
import { normalizeVstStrategicPercents } from "./vst-analytics-data";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";

function emptyPayload(): VstStrategicPayload {
  return {
    kpis: {
      tong_phien: 0,
      tong_co_hoi: 0,
      da_tuan_thu: 0,
      bo_sot: 0,
      loi_ky_thuat: 0,
      loi_thoi_gian: 0,
      lam_dung_gang: 0,
      dung_ky_thuat: 0,
      du_thoi_gian: 0,
      ty_le_tuan_thu: 0,
      ty_le_dung_ky_thuat: 0,
      ty_le_du_thoi_gian: 0,
      ty_le_lam_dung_gang: 0,
    },
    trendline: [],
    matrix_khoa: [],
    matrix_nghe: [],
    moments: [],
    gap_analysis: [],
    workload: {
      khoa_tu_giam_sat: 0,
      khoa_duoc_ksnk_giam_sat: 0,
      ksnk_so_co_hoi: 0,
      ksnk_so_phien: 0,
      co_cau_giam_sat: [],
    },
  };
}

describe("normalizeVstStrategicPercents", () => {
  it("recomputes 2/3 as 66.7 (1 decimal) instead of RPC 66.67", () => {
    const p = emptyPayload();
    p.kpis = {
      ...p.kpis,
      tong_phien: 1,
      tong_co_hoi: 3,
      da_tuan_thu: 2,
      ty_le_tuan_thu: 66.67,
    };
    p.trendline = [
      { label: "T1", min_date: "2026-01-01", tong_co_hoi: 3, da_tuan_thu: 2, ty_le_tuan_thu: 66.67 },
    ];
    const out = normalizeVstStrategicPercents(p);
    expect(out.kpis.ty_le_tuan_thu).toBe(66.7);
    expect(out.trendline[0]?.ty_le_tuan_thu).toBe(66.7);
  });

  it("recomputes gap from counts", () => {
    const p = emptyPayload();
    p.kpis.tong_co_hoi = 1;
    p.gap_analysis = [
      {
        id: "k1",
        ten: "Khoa A",
        tgs_co_hoi: 3,
        tgs_dat: 2,
        ty_le_tgs: 66.67,
        ksnk_co_hoi: 3,
        ksnk_dat: 1,
        ty_le_ksnk: 33.33,
        do_lech: null,
      },
    ];
    const out = normalizeVstStrategicPercents(p);
    expect(out.gap_analysis[0]?.ty_le_tgs).toBe(66.7);
    expect(out.gap_analysis[0]?.ty_le_ksnk).toBe(33.3);
  });
});
