import type { CompareRow } from "@/lib/analytics/supervision-analytics.types";
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

export type GapKhoaSourceRow = {
  id?: string;
  ten?: string;
  ma_khoa?: string;
  ty_le_tgs?: number | null;
  ty_le_ksnk?: number | null;
  do_lech?: number | null;
  tgs_co_hoi?: number;
  ksnk_co_hoi?: number;
  tgs_quan_sat?: number;
  ksnk_quan_sat?: number;
};

export type GapKhoaRow = {
  id: string;
  ten: string;
  label: string;
  ty_le_tgs: number | null;
  ty_le_ksnk: number | null;
  vol_tgs: number;
  vol_ksnk: number;
};

export function khoaChartLabel(row: {
  ten?: string | null;
  ten_khoa?: string | null;
  ma_khoa?: string | null;
}): string {
  const ma = String(row.ma_khoa ?? "").trim();
  if (ma) return ma;
  return String(row.ten ?? row.ten_khoa ?? "").trim() || "—";
}

function placeholderKhoaLabel(ten: string): string {
  const paren = ten.match(/\(([A-Z0-9][A-Z0-9-]*)\)\s*$/i);
  if (paren) return paren[1].toUpperCase();
  return ten.length > 12 ? `${ten.slice(0, 10)}…` : ten;
}

export function normalizeGapKhoaRow(r: GapKhoaSourceRow): GapKhoaRow {
  const ten = String(r.ten ?? "").trim() || "—";
  return {
    id: String(r.id ?? r.ma_khoa ?? ten),
    ten,
    label: khoaChartLabel(r),
    ty_le_tgs: r.ty_le_tgs == null ? null : roundPercent2(r.ty_le_tgs),
    ty_le_ksnk: r.ty_le_ksnk == null ? null : roundPercent2(r.ty_le_ksnk),
    vol_tgs: Number(r.tgs_co_hoi ?? r.tgs_quan_sat ?? 0),
    vol_ksnk: Number(r.ksnk_co_hoi ?? r.ksnk_quan_sat ?? 0),
  };
}

/** Gộp gap_analysis với khoa đã lọc — khoa chưa có phiên vẫn xuất hiện. */
export function buildGapKhoaRows(
  gapRows: GapKhoaSourceRow[] | null | undefined,
  selectedKhoaIds: string[] | undefined,
  khoaOptions: { id: string; label: string }[],
  khoaOptionCount: number,
): GapKhoaRow[] {
  const byId = new Map<string, GapKhoaRow>();
  for (const r of gapRows ?? []) {
    if (!r.id) continue;
    byId.set(r.id, normalizeGapKhoaRow(r));
  }

  const isFiltered = Boolean(selectedKhoaIds?.length && selectedKhoaIds.length < khoaOptionCount);
  const rows = isFiltered
    ? (selectedKhoaIds ?? []).map((id) => {
        const existing = byId.get(id);
        if (existing) return existing;
        const opt = khoaOptions.find((o) => o.id === id);
        const ten = opt?.label ?? id;
        return {
          id,
          ten,
          label: placeholderKhoaLabel(ten),
          ty_le_tgs: null,
          ty_le_ksnk: null,
          vol_tgs: 0,
          vol_ksnk: 0,
        };
      })
    : [...byId.values()];

  return rows.sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

export function countKsnkCoveredKhoa(rows: GapKhoaRow[]): { covered: number; total: number } {
  const total = rows.length;
  const covered = rows.filter((r) => r.vol_ksnk > 0).length;
  return { covered, total };
}

export function countTgsCoveredKhoa(rows: GapKhoaRow[]): { covered: number; total: number } {
  const total = rows.length;
  const covered = rows.filter((r) => r.vol_tgs > 0).length;
  return { covered, total };
}

/** Đủ hai nguồn trong kỳ — mới được đối soát TGS vs KSNK. */
export function isGapComparable(row: GapKhoaRow): boolean {
  return row.vol_tgs > 0 && row.vol_ksnk > 0;
}

export type GapExclusionReason = "Chưa triển khai" | "Chưa TGS" | "Chưa KSNK";

export function gapExclusionReason(row: GapKhoaRow): GapExclusionReason | null {
  if (isGapComparable(row)) return null;
  if (row.vol_tgs === 0 && row.vol_ksnk === 0) return "Chưa triển khai";
  if (row.vol_tgs === 0) return "Chưa TGS";
  return "Chưa KSNK";
}

export function partitionGapKhoaRows(rows: GapKhoaRow[]): {
  comparable: GapKhoaRow[];
  excluded: GapKhoaRow[];
} {
  const comparable: GapKhoaRow[] = [];
  const excluded: GapKhoaRow[] = [];
  for (const row of rows) {
    if (isGapComparable(row)) comparable.push(row);
    else {
      const reason = gapExclusionReason(row);
      if (reason) excluded.push(row);
    }
  }
  return { comparable, excluded };
}

export type CoverageCellStatus = "none" | "tgs_only" | "ksnk_only" | "comparable";

export function coverageCellStatus(row: GapKhoaRow | undefined): CoverageCellStatus {
  if (!row || (row.vol_tgs === 0 && row.vol_ksnk === 0)) return "none";
  if (isGapComparable(row)) return "comparable";
  if (row.vol_tgs > 0) return "tgs_only";
  return "ksnk_only";
}

export const COVERAGE_STATUS_LABELS: Record<CoverageCellStatus, string> = {
  none: "Chưa GS",
  tgs_only: "Có TGS",
  ksnk_only: "Có KSNK",
  comparable: "Đủ đối soát",
};

export type CoverageTopicInput = { id: string; label: string; rows: GapKhoaRow[] };

/** Hàng khoa thống nhất + ô trạng thái theo chuyên đề (Wave 2). */
export function buildCoverageMatrix(
  topics: CoverageTopicInput[],
): { khoaRows: GapKhoaRow[]; topicLabels: { id: string; label: string }[] } {
  const byKhoa = new Map<string, GapKhoaRow>();
  for (const topic of topics) {
    for (const row of topic.rows) {
      const cur = byKhoa.get(row.id);
      if (!cur || row.ten.length > cur.ten.length) byKhoa.set(row.id, row);
    }
  }
  const khoaRows = [...byKhoa.values()].sort((a, b) => a.label.localeCompare(b.label, "vi"));
  const topicLabels = topics.map((t) => ({ id: t.id, label: t.label }));
  return { khoaRows, topicLabels };
}

export function countKhoaMissingTgs(rows: GapKhoaRow[]): number {
  return rows.filter((r) => r.vol_tgs === 0).length;
}

export function findGapRowByKhoaId(rows: GapKhoaRow[], khoaId: string): GapKhoaRow | undefined {
  return rows.find((r) => r.id === khoaId);
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

/** @deprecated Dùng buildGapKhoaRows + SupervisionKhoaTriptych */
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
