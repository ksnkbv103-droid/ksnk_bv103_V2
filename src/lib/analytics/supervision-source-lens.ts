/** Hai lens TGS × KSNK — một nguồn trên fold chính; đối soát ở lớp 2. */

import type { GapKhoaRow } from "@/lib/analytics/supervision-matrix-mappers";

export type SupervisionSourceLens = "ksnk" | "tgs";

export const SUPERVISION_SOURCE_LENS_LABEL: Record<SupervisionSourceLens, string> = {
  ksnk: "Chuyên trách",
  tgs: "Tự giám sát",
};

export function otherLens(lens: SupervisionSourceLens): SupervisionSourceLens {
  return lens === "ksnk" ? "tgs" : "ksnk";
}

/** % theo lens — null nếu khoa chưa có mẫu số nguồn đó. */
export function tyLeForLens(row: GapKhoaRow, lens: SupervisionSourceLens): number | null {
  if (lens === "ksnk") {
    return row.vol_ksnk > 0 && row.ty_le_ksnk != null ? row.ty_le_ksnk : null;
  }
  return row.vol_tgs > 0 && row.ty_le_tgs != null ? row.ty_le_tgs : null;
}

/** Ẩn nguồn còn lại trên chart/bảng (vol = 0, % = null). */
export function maskGapRowsForLens(rows: GapKhoaRow[], lens: SupervisionSourceLens): GapKhoaRow[] {
  return rows.map((r) => {
    if (lens === "ksnk") {
      return {
        ...r,
        ty_le_tgs: null,
        vol_tgs: 0,
        dat_tgs: 0,
      };
    }
    return {
      ...r,
      ty_le_ksnk: null,
      vol_ksnk: 0,
      dat_ksnk: 0,
    };
  });
}

/** Chỉ khoa có dữ liệu lens đang chọn. */
export function gapRowsWithLensData(rows: GapKhoaRow[], lens: SupervisionSourceLens): GapKhoaRow[] {
  return rows.filter((r) => (lens === "ksnk" ? r.vol_ksnk > 0 : r.vol_tgs > 0));
}

/** Đối soát comparable — cả hai nguồn > 0. */
export function comparableGapRows(rows: GapKhoaRow[]): GapKhoaRow[] {
  return rows.filter((r) => r.vol_ksnk > 0 && r.vol_tgs > 0 && r.ty_le_ksnk != null && r.ty_le_tgs != null);
}
