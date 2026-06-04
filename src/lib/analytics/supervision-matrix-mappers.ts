import type { CompareRow } from "@/lib/analytics/supervision-analytics-charts";
import { roundPercent2 } from "@/lib/analytics/supervision-percent";

type MatrixRow = {
  ten?: string;
  ma_khoa?: string;
  ty_le_tuan_thu?: number;
  tong_quan_sat?: number;
  tong_dat?: number;
  tong_co_hoi?: number;
  da_tuan_thu?: number;
};

export function khoaChartLabel(row: MatrixRow): string {
  const ma = String(row.ma_khoa ?? "").trim();
  if (ma) return ma;
  return String(row.ten ?? "").trim() || "—";
}

export function toCompareRows(
  rows: MatrixRow[] | null | undefined,
  options?: { khoaMa?: boolean },
): CompareRow[] {
  return (rows ?? []).map((r) => ({
    ten: options?.khoaMa ? khoaChartLabel(r) : String(r.ten ?? "").trim() || "—",
    ty_le_tuan_thu: roundPercent2(r.ty_le_tuan_thu ?? 0),
    tong: Number(r.tong_quan_sat ?? r.tong_co_hoi ?? 0),
    dat: Number(r.tong_dat ?? r.da_tuan_thu ?? 0),
  }));
}

export function mapGapRowsForKhoaMa(
  rows: { ten?: string; ma_khoa?: string; ty_le_tgs?: number | null; ty_le_ksnk?: number | null }[] | null | undefined,
) {
  return (rows ?? []).map((r) => ({
    ten: khoaChartLabel(r),
    ty_le_tgs: r.ty_le_tgs == null ? null : roundPercent2(r.ty_le_tgs),
    ty_le_ksnk: r.ty_le_ksnk == null ? null : roundPercent2(r.ty_le_ksnk),
  }));
}

export type GscCompareMatrices = {
  matrix_khu_vuc?: MatrixRow[];
  matrix_khu_vuc_nhom?: MatrixRow[];
  matrix_nghe?: MatrixRow[];
  matrix_hinh_thuc?: MatrixRow[];
  matrix_cach_thuc?: MatrixRow[];
};

export type VstCompareMatrices = {
  matrix_khu_vuc?: MatrixRow[];
  matrix_khu_vuc_nhom?: MatrixRow[];
  matrix_hinh_thuc?: MatrixRow[];
};
