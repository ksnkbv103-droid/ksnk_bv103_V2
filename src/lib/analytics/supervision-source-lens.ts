/** Hai lens TGS × KSNK — một nguồn trên fold chính; đối soát ở lớp 2. */

import type { GapKhoaRow } from "@/lib/analytics/supervision-matrix-mappers";
import {
  buildActionBoardModel,
  type ActionBoardModel,
  type ActionBoardSource,
  type MomentLike,
  type TopViolationLike,
} from "@/lib/analytics/supervision-action-board";
import { DOI_SOAT_MIN_SAMPLE } from "@/lib/analytics/supervision-thresholds";

export type SupervisionSourceLens = "ksnk" | "tgs";

/** Mã stype RPC (`p_hinh_thuc_ids`) — khớp filter Dashboard / gap_analysis. */
export const SUPERVISION_LENS_HINH_THUC_IDS: Record<SupervisionSourceLens, string> = {
  ksnk: "KSNK",
  tgs: "TU_GIAM_SAT",
};

export const SUPERVISION_SOURCE_LENS_LABEL: Record<SupervisionSourceLens, string> = {
  ksnk: "Chuyên trách",
  tgs: "Tự giám sát",
};

export function hinhThucIdsForLens(lens: SupervisionSourceLens): string[] {
  return [SUPERVISION_LENS_HINH_THUC_IDS[lens]];
}

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

/** Chỉ khoa có dữ liệu lens (để Action board / ranking). */
export function gapRowsWithLensData(rows: GapKhoaRow[], lens: SupervisionSourceLens): GapKhoaRow[] {
  return rows.filter((r) => (lens === "ksnk" ? r.vol_ksnk > 0 : r.vol_tgs > 0));
}

/** Đối soát comparable — cả hai nguồn đủ min-N (GS-07); mặc định > 0 nếu không truyền source. */
export function comparableGapRows(
  rows: GapKhoaRow[],
  opts?: { source?: "vst" | "gsc"; minSample?: number },
): GapKhoaRow[] {
  const min =
    opts?.minSample ??
    (opts?.source === "vst"
      ? DOI_SOAT_MIN_SAMPLE.vst
      : opts?.source === "gsc"
        ? DOI_SOAT_MIN_SAMPLE.gsc
        : 1);
  return rows.filter(
    (r) =>
      r.vol_ksnk >= min &&
      r.vol_tgs >= min &&
      r.ty_le_ksnk != null &&
      r.ty_le_tgs != null,
  );
}

export function buildActionBoardFromGap(input: {
  source: ActionBoardSource;
  lens: SupervisionSourceLens;
  gapRows: GapKhoaRow[];
  moments?: MomentLike[] | null;
  topViolations?: TopViolationLike[] | null;
  vstKpis?: {
    loi_ky_thuat?: number | null;
    bo_sot?: number | null;
    tong_co_hoi?: number | null;
  } | null;
  limit?: number;
}): ActionBoardModel {
  const withData = gapRowsWithLensData(input.gapRows, input.lens);
  const matrixKhoa = withData.map((r) => {
    const tong = input.lens === "ksnk" ? r.vol_ksnk : r.vol_tgs;
    const dat = input.lens === "ksnk" ? r.dat_ksnk : r.dat_tgs;
    const tyLe = tyLeForLens(r, input.lens);
    return {
      id: r.id,
      ma_khoa: r.label,
      ten: r.ten || r.label,
      tong_co_hoi: input.source === "vst" ? tong : undefined,
      da_tuan_thu: input.source === "vst" ? dat : undefined,
      tong_quan_sat: input.source === "gsc" ? tong : undefined,
      tong_dat: input.source === "gsc" ? dat : undefined,
      ty_le_tuan_thu: tyLe,
    };
  });

  // Lỗi/moment: chỉ lens chuyên trách (RPC chưa tách stype cho TGS).
  const useErrors = input.lens === "ksnk";
  return buildActionBoardModel({
    source: input.source,
    matrixKhoa,
    moments: useErrors && input.source === "vst" ? input.moments : null,
    topViolations: useErrors && input.source === "gsc" ? input.topViolations : null,
    vstKpis: useErrors ? input.vstKpis : null,
    limit: input.limit,
  });
}
