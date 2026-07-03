import type {
  GscChecklistCriterionKhoaRow,
  GscChecklistOverviewRow,
  GscCriterionMatrixRow,
} from "@/modules/giam-sat-chung/types/gsc-strategic.types";

/** Xếp BK theo rủi ro: tuân thủ thấp trước, vi phạm nhiều trước. */
export function sortChecklistOverviewByRisk(rows: GscChecklistOverviewRow[]): GscChecklistOverviewRow[] {
  return [...rows].sort(
    (a, b) =>
      a.ty_le_tuan_thu - b.ty_le_tuan_thu ||
      (b.tong_vi_pham ?? 0) - (a.tong_vi_pham ?? 0) ||
      a.ma_bk.localeCompare(b.ma_bk, "vi"),
  );
}

/** Top N BK (báo cáo tổng hợp deep link). */
export function pickTopInterventionChecklists(
  rows: GscChecklistOverviewRow[],
  limit = 5,
): GscChecklistOverviewRow[] {
  return sortChecklistOverviewByRisk(rows).slice(0, limit);
}

/** Tiêu chí yếu trước (mẫu VST moments). */
export function sortCriterionMatrix(rows: GscCriterionMatrixRow[]): GscCriterionMatrixRow[] {
  return [...rows].sort(
    (a, b) =>
      (a.ty_le_tuan_thu ?? 100) - (b.ty_le_tuan_thu ?? 100) ||
      b.tong_vi_pham - a.tong_vi_pham ||
      (a.stt ?? 0) - (b.stt ?? 0),
  );
}

export function groupCriterionKhoaRows(
  rows: GscChecklistCriterionKhoaRow[],
): Map<string, GscChecklistCriterionKhoaRow[]> {
  const map = new Map<string, GscChecklistCriterionKhoaRow[]>();
  for (const row of rows) {
    const list = map.get(row.criterion_id) ?? [];
    list.push(row);
    map.set(row.criterion_id, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => b.ty_le_vi_pham - a.ty_le_vi_pham || a.ten.localeCompare(b.ten, "vi"));
  }
  return map;
}
