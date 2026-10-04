/**
 * GSC orphan TC — resolve tên / id qua map (mirror SQL fn_gsc_resolve_*).
 * Không sửa results_jsonb; legacy giữ id cũ + nhóm báo cáo riêng.
 */

export const LEGACY_ORPHAN_CRITERION_GROUP = "Tiêu chí cũ (không quy đổi)";

export type OrphanMatchConfidence = "exact" | "fuzzy" | "legacy";

export type OrphanCriterionMapRow = {
  old_criterion_id: string;
  old_noi_dung: string;
  new_criterion_id?: string | null;
  new_ma_tc?: string | null;
  match_confidence?: string | null;
};

export function isMappedOrphanConfidence(
  confidence?: string | null,
): confidence is "exact" | "fuzzy" {
  return confidence === "exact" || confidence === "fuzzy";
}

export function resolveCriterionLabel(
  criterionId: string,
  liveTenById: Map<string, string>,
  orphanMap: Map<string, OrphanCriterionMapRow>,
): string {
  const live = liveTenById.get(criterionId);
  if (live) return live;
  const orphan = orphanMap.get(criterionId);
  if (orphan && !isMappedOrphanConfidence(orphan.match_confidence)) {
    return LEGACY_ORPHAN_CRITERION_GROUP;
  }
  if (orphan?.old_noi_dung) return orphan.old_noi_dung;
  return "Tiêu chí (đã đổi mẫu)";
}

/** Agg theo tiêu chí mới chỉ khi exact/fuzzy có new_criterion_id; legacy giữ id cũ. */
export function resolveCriterionIdForAgg(
  criterionId: string,
  orphanMap: Map<string, OrphanCriterionMapRow>,
): string {
  const orphan = orphanMap.get(criterionId);
  if (
    orphan?.new_criterion_id &&
    isMappedOrphanConfidence(orphan.match_confidence)
  ) {
    return orphan.new_criterion_id;
  }
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
