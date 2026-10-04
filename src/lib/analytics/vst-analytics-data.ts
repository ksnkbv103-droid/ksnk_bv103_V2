import { rateFromTotals } from "@/lib/analytics/supervision-metrics/formulas";
import { roundPercent1 } from "@/lib/analytics/supervision-percent";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";

function withCountsPercent<T extends { tong_co_hoi?: number; da_tuan_thu?: number; ty_le_tuan_thu?: number | null }>(
  row: T,
): T {
  const pct = rateFromTotals(Number(row.da_tuan_thu ?? 0), Number(row.tong_co_hoi ?? 0));
  return pct == null ? row : { ...row, ty_le_tuan_thu: pct };
}

/** Chênh tự GS − chuyên trách sau khi cả hai % đã làm tròn 1 chữ số từ đếm. */
export function vstGapDoLech(
  tyLeTgs: number | null | undefined,
  tyLeKsnk: number | null | undefined,
): number | null {
  if (tyLeTgs == null || tyLeKsnk == null) return null;
  if (!Number.isFinite(tyLeTgs) || !Number.isFinite(tyLeKsnk)) return null;
  return roundPercent1(tyLeTgs - tyLeKsnk);
}

function remapVstGapRows(rows: VstStrategicPayload["gap_analysis"] | undefined) {
  return (rows ?? []).map((row) => {
    const tyLeTgs = rateFromTotals(row.tgs_dat, row.tgs_co_hoi) ?? row.ty_le_tgs;
    const tyLeKsnk = rateFromTotals(row.ksnk_dat, row.ksnk_co_hoi) ?? row.ty_le_ksnk;
    return {
      ...row,
      ty_le_tgs: tyLeTgs,
      ty_le_ksnk: tyLeKsnk,
      do_lech: vstGapDoLech(tyLeTgs, tyLeKsnk),
    };
  });
}

/** VST: % = đạt / tong_co_hoi, 1 chữ số — không tin ROUND RPC. */
export function normalizeVstStrategicPercents(payload: VstStrategicPayload): VstStrategicPayload {
  const kpis = payload.kpis;
  const tong = Number(kpis?.tong_co_hoi ?? 0);
  const daTuanThu = Number(kpis?.da_tuan_thu ?? 0);
  const boSot = Number(kpis?.bo_sot ?? 0);
  return {
    ...payload,
    kpis: kpis
      ? {
          ...kpis,
          ty_le_tuan_thu: rateFromTotals(kpis.da_tuan_thu, tong) ?? kpis.ty_le_tuan_thu,
          ty_le_dung_ky_thuat: rateFromTotals(kpis.dung_ky_thuat, daTuanThu) ?? kpis.ty_le_dung_ky_thuat,
          ty_le_du_thoi_gian: rateFromTotals(kpis.du_thoi_gian, daTuanThu) ?? kpis.ty_le_du_thoi_gian,
          ty_le_lam_dung_gang: rateFromTotals(kpis.lam_dung_gang, boSot) ?? kpis.ty_le_lam_dung_gang,
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
