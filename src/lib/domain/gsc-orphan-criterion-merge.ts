/**
 * GSC orphan merge (N-GHEP) — quy đổi nhiều TC cũ → 1 TC mới lúc đọc.
 * Mirror SQL fn_gsc_expand_session_results_for_tc. Không sửa results_jsonb.
 */

import {
  isMappedOrphanConfidence,
  resolveCriterionIdForAgg,
  type OrphanCriterionMapRow,
} from "./gsc-orphan-criterion-resolve";

export type MergeGroupMember = {
  old_criterion_id: string;
  old_ma_tc?: string | null;
};

export type MergeGroup = {
  merge_group: string;
  ma_bk_short: string;
  target_ma_tc: string;
  target_stt?: number | null;
  /** Live TC id sau SCR+resolve; null = chưa apply → không ghép. */
  target_criterion_id?: string | null;
  members: MergeGroupMember[];
};

export type SessionResultRow = {
  criterion_id: string;
  value: string;
};

export type ExpandedTcAggRow = {
  source_criterion_id: string;
  resolved_criterion_id: string;
  value: string;
  merge_applied: boolean;
};

function normValue(raw: string): string {
  return String(raw ?? "").trim().toUpperCase();
}

function isScoredValue(v: string): boolean {
  return v === "DAT" || v === "KHONG_DAT";
}

/** Mọi phần Đạt → Đạt; ≥1 Không đạt → Không đạt. */
export function mergeScoredValues(values: string[]): "DAT" | "KHONG_DAT" {
  return values.some((v) => normValue(v) === "KHONG_DAT") ? "KHONG_DAT" : "DAT";
}

/**
 * Một phiên → danh sách kết quả sau ghép + map 1-1.
 * Ghép chỉ khi đủ mọi phần và không có N/A/thiếu; tối đa 1 dòng / TC đích.
 */
export function expandSessionResultsForTcAgg(
  results: SessionResultRow[],
  orphanMap: Map<string, OrphanCriterionMapRow>,
  mergeGroups: MergeGroup[],
): ExpandedTcAggRow[] {
  const byId = new Map<string, string>();
  for (const r of results) {
    if (!r.criterion_id) continue;
    byId.set(r.criterion_id, normValue(r.value));
  }

  const suppressed = new Set<string>();
  const out: ExpandedTcAggRow[] = [];

  for (const g of mergeGroups) {
    const targetId = g.target_criterion_id?.trim() || null;
    if (!targetId || g.members.length === 0) continue;

    const memberIds = g.members.map((m) => m.old_criterion_id);
    const values: string[] = [];
    let canMerge = true;
    for (const id of memberIds) {
      const v = byId.get(id);
      if (v == null || !isScoredValue(v)) {
        canMerge = false;
        break;
      }
      values.push(v);
    }
    if (!canMerge) continue;

    for (const id of memberIds) suppressed.add(id);
    out.push({
      source_criterion_id: targetId,
      resolved_criterion_id: targetId,
      value: mergeScoredValues(values),
      merge_applied: true,
    });
  }

  for (const [criterionId, value] of byId) {
    if (suppressed.has(criterionId)) continue;
    if (!isScoredValue(value) && value !== "NA" && value !== "") {
      // giữ value lạ như NA để caller lọc
    }
    out.push({
      source_criterion_id: criterionId,
      resolved_criterion_id: resolveCriterionIdForAgg(criterionId, orphanMap),
      value,
      merge_applied: false,
    });
  }

  return out;
}

/** Kiểm tra 8 đích ghép không trùng đích map 1-1 (exact/fuzzy) cùng BK. */
export function assertMergeTargetsFreeFromOneToOne(
  mergeGroups: MergeGroup[],
  orphanRows: Array<{
    ma_bk_short: string;
    new_ma_tc: string | null;
    match_confidence: string | null | undefined;
  }>,
): { ok: boolean; conflicts: string[] } {
  const occupied = new Set<string>();
  for (const r of orphanRows) {
    if (
      r.new_ma_tc &&
      isMappedOrphanConfidence(r.match_confidence)
    ) {
      occupied.add(`${r.ma_bk_short}:${r.new_ma_tc}`);
    }
  }
  const conflicts: string[] = [];
  for (const g of mergeGroups) {
    const key = `${g.ma_bk_short}:${g.target_ma_tc}`;
    if (occupied.has(key)) conflicts.push(key);
  }
  return { ok: conflicts.length === 0, conflicts };
}
