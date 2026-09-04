import { rateFromTotals } from "@/lib/analytics/supervision-metrics/formulas";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";

function withCountsPercent<T extends { tong_co_hoi?: number; da_tuan_thu?: number; ty_le_tuan_thu?: number | null }>(
  row: T,
): T {
  const pct = rateFromTotals(Number(row.da_tuan_thu ?? 0), Number(row.tong_co_hoi ?? 0));
  return pct == null ? row : { ...row, ty_le_tuan_thu: pct };
}

function remapVstGapRows(rows: VstStrategicPayload["gap_analysis"] | undefined) {
  return (rows ?? []).map((row) => ({
    ...row,
    ty_le_tgs: rateFromTotals(row.tgs_dat, row.tgs_co_hoi) ?? row.ty_le_tgs,
    ty_le_ksnk: rateFromTotals(row.ksnk_dat, row.ksnk_co_hoi) ?? row.ty_le_ksnk,
  }));
}

/** VST: % = đạt / tong_co_hoi, 1 chữ số — không tin ROUND RPC. */
export function normalizeVstStrategicPercents(payload: VstStrategicPayload): VstStrategicPayload {
  const kpis = payload.kpis;
  const tong = Number(kpis?.tong_co_hoi ?? 0);
  return {
    ...payload,
    kpis: kpis
      ? {
          ...kpis,
          ty_le_tuan_thu: rateFromTotals(kpis.da_tuan_thu, tong) ?? kpis.ty_le_tuan_thu,
          ty_le_dung_ky_thuat: rateFromTotals(kpis.dung_ky_thuat, tong) ?? kpis.ty_le_dung_ky_thuat,
          ty_le_du_thoi_gian: rateFromTotals(kpis.du_thoi_gian, tong) ?? kpis.ty_le_du_thoi_gian,
          ty_le_lam_dung_gang: rateFromTotals(kpis.lam_dung_gang, tong) ?? kpis.ty_le_lam_dung_gang,
        }
      : kpis,
    trendline: (payload.trendline ?? []).map(withCountsPercent),
    matrix_khoa: (payload.matrix_khoa ?? []).map(withCountsPercent),
    matrix_khoi: payload.matrix_khoi?.map(withCountsPercent),
    matrix_khu_vuc: payload.matrix_khu_vuc?.map(withCountsPercent),
    matrix_nghe: payload.matrix_nghe?.map(withCountsPercent),
    matrix_hinh_thuc: payload.matrix_hinh_thuc?.map(withCountsPercent),
    matrix_cach_thuc: payload.matrix_cach_thuc?.map(withCountsPercent),
    moments: (payload.moments ?? []).map(withCountsPercent),
    gap_analysis: remapVstGapRows(payload.gap_analysis),
  };
}
