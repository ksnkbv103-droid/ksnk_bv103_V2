/**
 * GSC orphan TC — resolve tên / id qua map (mirror SQL fn_gsc_resolve_*).
 * Không sửa results_jsonb; TC không map vẫn hiện tên cũ.
 */

export type OrphanCriterionMapRow = {
  old_criterion_id: string;
  old_noi_dung: string;
  new_criterion_id?: string | null;
  match_confidence?: string | null;
};

export function resolveCriterionLabel(
  criterionId: string,
  liveTenById: Map<string, string>,
  orphanMap: Map<string, OrphanCriterionMapRow>,
): string {
  const live = liveTenById.get(criterionId);
  if (live) return live;
  const orphan = orphanMap.get(criterionId);
  if (orphan?.old_noi_dung) return orphan.old_noi_dung;
  return "Tiêu chí (đã đổi mẫu)";
}

export function resolveCriterionIdForAgg(
  criterionId: string,
  orphanMap: Map<string, OrphanCriterionMapRow>,
): string {
  const orphan = orphanMap.get(criterionId);
  if (orphan?.new_criterion_id) return orphan.new_criterion_id;
  return criterionId;
}

/** Tổng quan sát cấp tiêu chí (sau map) + số KQ không map được = mẫu cấp BK. */
export function assertCriterionTotalsMatchBk(input: {
  bkQuanSat: number;
  mappedQuanSat: number;
  unmappedQuanSat: number;
}): boolean {
  return input.mappedQuanSat + input.unmappedQuanSat === input.bkQuanSat;
}
