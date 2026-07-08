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
  tgs_dat?: number;
  ksnk_co_hoi?: number;
  ksnk_dat?: number;
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
  dat_tgs: number;
  dat_ksnk: number;
};

export type GapKhoaSortMetric = "ty_le_ksnk" | "ty_le_tgs" | "vol_ksnk" | "vol_tgs" | "label";
export type GapKhoaSortOrder = "asc" | "desc";

export function khoaChartLabel(row: {
  ten?: string | null;
  ten_khoa?: string | null;
  ma_khoa?: string | null;
}): string {
  const ma = String(row.ma_khoa ?? "").trim();
  if (ma) return ma;
  return String(row.ten ?? row.ten_khoa ?? "").trim() || "—";
}

function parseMaFromKhoaOptionLabel(label: string): string | null {
  const bracket = label.match(/^\[([^\]]+)\]/);
  if (bracket) return bracket[1].trim();
  const paren = label.match(/\(([A-Z0-9][A-Z0-9-]*)\)\s*$/i);
  if (paren) return paren[1].toUpperCase();
  return null;
}

function placeholderGapKhoaRow(id: string, khoaOptions: { id: string; label: string }[]): GapKhoaRow {
  const opt = khoaOptions.find((o) => o.id === id);
  const ten = opt?.label ?? id;
  const ma = parseMaFromKhoaOptionLabel(ten);
  return {
    id,
    ten,
    label: khoaChartLabel({ ten_khoa: ten.replace(/^\[[^\]]+\]\s*/, ""), ma_khoa: ma }),
    ty_le_tgs: null,
    ty_le_ksnk: null,
    vol_tgs: 0,
    vol_ksnk: 0,
    dat_tgs: 0,
    dat_ksnk: 0,
  };
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
    dat_tgs: Number(r.tgs_dat ?? 0),
    dat_ksnk: Number(r.ksnk_dat ?? 0),
  };
}

import { SUPERVISION_COMPLIANCE_THRESHOLDS } from "@/lib/analytics/supervision-thresholds";

/** Ngưỡng tô cảnh báo % khoa — alias SSOT `KHOA_WARN_PCT`. */
export const KHOA_COMPLIANCE_WARN_PCT = SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT;

/** Sắp xếp hàng khoa — mặc định bảng: % cao→thấp trên cột chính (KSNK). */
export function sortGapRowsByMetric(
  rows: GapKhoaRow[],
  key: GapKhoaSortMetric,
  order: GapKhoaSortOrder = "asc",
): GapKhoaRow[] {
  const dir = order === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "label") return dir * a.label.localeCompare(b.label, "vi");
    const av = a[key];
    const bv = b[key];
    const aNull = av == null;
    const bNull = bv == null;
    if (aNull && bNull) return a.label.localeCompare(b.label, "vi");
    if (aNull) return 1;
    if (bNull) return -1;
    if (av !== bv) return dir * ((av as number) - (bv as number));
    return a.label.localeCompare(b.label, "vi");
  });
}

/** Gộp gap VST + GSC theo khoa — dùng báo cáo tổng hợp (master table). */
export function mergeMasterGapRows(vstRows: GapKhoaRow[], gscRows: GapKhoaRow[]): GapKhoaRow[] {
  const byId = new Map<string, GapKhoaRow>();
  for (const r of vstRows) byId.set(r.id, { ...r });
  for (const r of gscRows) {
    const cur = byId.get(r.id);
    if (!cur) {
      byId.set(r.id, { ...r });
      continue;
    }
    byId.set(r.id, {
      ...cur,
      ty_le_tgs: cur.ty_le_tgs ?? r.ty_le_tgs,
      ty_le_ksnk: cur.ty_le_ksnk ?? r.ty_le_ksnk,
      vol_tgs: Math.max(cur.vol_tgs, r.vol_tgs),
      vol_ksnk: Math.max(cur.vol_ksnk, r.vol_ksnk),
      dat_tgs: Math.max(cur.dat_tgs, r.dat_tgs),
      dat_ksnk: Math.max(cur.dat_ksnk, r.dat_ksnk),
    });
  }
  return [...byId.values()];
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
  const targetIds = new Set<string>();
  if (isFiltered) {
    for (const id of selectedKhoaIds ?? []) targetIds.add(id);
  } else {
    for (const o of khoaOptions) targetIds.add(o.id);
  }
  for (const row of byId.values()) targetIds.add(row.id);

  return [...targetIds].map((id) => byId.get(id) ?? placeholderGapKhoaRow(id, khoaOptions));
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

export type GscCompareMatrices = {
  matrix_khoi?: MatrixRow[];
  matrix_khu_vuc?: MatrixRow[];
  matrix_nghe?: MatrixRow[];
  matrix_hinh_thuc?: MatrixRow[];
  matrix_cach_thuc?: MatrixRow[];
};

export type VstCompareMatrices = {
  matrix_khoi?: MatrixRow[];
  matrix_khu_vuc?: MatrixRow[];
  matrix_hinh_thuc?: MatrixRow[];
};
