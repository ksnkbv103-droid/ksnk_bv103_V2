import type {
  GscChecklistCriterionKhoaRow,
  GscChecklistOverviewRow,
  GscCriterionMatrixRow,
} from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { mergeBkStatRowsByTopic } from "@/lib/domain/gsc-bk-short-long-map";

/** N-GSC-3 mặc định: ≥30 tiêu chí áp dụng và ≥3 phiên mới xếp «cần chú ý». */
export const GSC_BK_ATTENTION_MIN_QUAN_SAT = 30;
export const GSC_BK_ATTENTION_MIN_PHIEN = 3;

export function meetsChecklistAttentionMinN(row: {
  tong_quan_sat?: number | null;
  tong_phien?: number | null;
}): boolean {
  return (
    Number(row.tong_quan_sat ?? 0) >= GSC_BK_ATTENTION_MIN_QUAN_SAT &&
    Number(row.tong_phien ?? 0) >= GSC_BK_ATTENTION_MIN_PHIEN
  );
}

/** Xếp BK theo rủi ro: tuân thủ thấp trước, vi phạm nhiều trước. null/% không tính → cuối. */
export function sortChecklistOverviewByRisk(rows: GscChecklistOverviewRow[]): GscChecklistOverviewRow[] {
  return [...rows].sort((a, b) => {
    const aTy = a.ty_le_tuan_thu;
    const bTy = b.ty_le_tuan_thu;
    const aNull = aTy == null || Number(a.tong_quan_sat ?? 0) <= 0;
    const bNull = bTy == null || Number(b.tong_quan_sat ?? 0) <= 0;
    if (aNull !== bNull) return aNull ? 1 : -1;
    return (
      Number(aTy ?? 100) - Number(bTy ?? 100) ||
      (b.tong_vi_pham ?? 0) - (a.tong_vi_pham ?? 0) ||
      a.ma_bk.localeCompare(b.ma_bk, "vi")
    );
  });
}

/** GSC-05: tách đủ min-N vs mẫu mỏng; gộp short↔dài. */
export function partitionChecklistOverviewByMinN(
  rows: GscChecklistOverviewRow[],
): { attention: GscChecklistOverviewRow[]; thin: GscChecklistOverviewRow[] } {
  const merged = mergeBkStatRowsByTopic(rows) as GscChecklistOverviewRow[];
  const attention: GscChecklistOverviewRow[] = [];
  const thin: GscChecklistOverviewRow[] = [];
  for (const row of merged) {
    if (meetsChecklistAttentionMinN(row) && Number(row.tong_quan_sat ?? 0) > 0) {
      attention.push(row);
    } else if (Number(row.tong_phien ?? 0) > 0) {
      thin.push(row);
    }
  }
  return {
    attention: sortChecklistOverviewByRisk(attention),
    thin: sortChecklistOverviewByRisk(thin),
  };
}

/** Top N BK (báo cáo tổng hợp deep link) — chỉ đủ min-N. */
export function pickTopInterventionChecklists(
  rows: GscChecklistOverviewRow[],
  limit = 5,
): GscChecklistOverviewRow[] {
  return partitionChecklistOverviewByMinN(rows).attention.slice(0, limit);
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
