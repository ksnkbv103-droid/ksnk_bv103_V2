/**
 * Sổ kết luận theo mẫu (XN/CĐHA) — localStorage.
 * Giữ kết luận đã chốt (vd. không đủ TC) luôn hiện trên cột Kết luận
 * khi đang phân tích Index khác.
 */

import { khongDuTcKetLuanLabel } from "./nkbv-vi-sinh-analysis-status";

export type BaSampleConclusionDisposition =
  | "KHONG_DU_TC"
  | "SECONDARY_BSI"
  /** IP tự gắn nhãn (chế độ Tự phân tích) — không do disposition CDC. */
  | "MANUAL";

export type BaSampleConclusion = {
  sampleId: string;
  date: string;
  kind: "XN" | "CDHA";
  /**
   * KHONG_DU_TC — Index không đủ TC.
   * SECONDARY_BSI — máu quy kết thứ phát (phủ quyết: không mở khung Primary BSI).
   * MANUAL — nhãn do IP nhập ở chế độ Tự phân tích.
   */
  disposition: BaSampleConclusionDisposition;
  label: string;
  updatedAt: string;
};

function storageKey(maBenhAn: string) {
  return `nkbv-ba-conclusions:${maBenhAn}`;
}

export function normalizeSampleId(id: string): string {
  const s = String(id || "").trim();
  if (s.startsWith("lis:")) return s.slice(4) || s;
  return s;
}

export function loadBaSampleConclusions(maBenhAn: string): BaSampleConclusion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(maBenhAn));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BaSampleConclusion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBaSampleConclusions(
  maBenhAn: string,
  rows: BaSampleConclusion[],
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(maBenhAn), JSON.stringify(rows));
  } catch {
    /* quota */
  }
}

export function upsertBaSampleConclusion(
  maBenhAn: string,
  row: Omit<BaSampleConclusion, "updatedAt" | "label"> & { label?: string },
): BaSampleConclusion[] {
  const list = loadBaSampleConclusions(maBenhAn);
  const sampleId = String(row.sampleId || "").trim();
  const date = String(row.date || "").slice(0, 10);
  if (!sampleId || !date) return list;
  const next: BaSampleConclusion = {
    sampleId,
    date,
    kind: row.kind,
    disposition: row.disposition,
    label:
      row.label?.trim() ||
      (row.disposition === "KHONG_DU_TC"
        ? khongDuTcKetLuanLabel(date)
        : row.disposition === "MANUAL"
          ? "Kết luận thủ công"
          : "NKH thứ phát"),
    updatedAt: new Date().toISOString(),
  };
  const key = normalizeSampleId(sampleId);
  const idx = list.findIndex((r) => normalizeSampleId(r.sampleId) === key);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  saveBaSampleConclusions(maBenhAn, list);
  return list;
}

export function findBaSampleConclusion(
  rows: BaSampleConclusion[],
  sampleId: string,
): BaSampleConclusion | null {
  const key = normalizeSampleId(sampleId);
  if (!key) return null;
  return rows.find((r) => normalizeSampleId(r.sampleId) === key) || null;
}

export function removeBaSampleConclusion(
  maBenhAn: string,
  sampleId: string,
): BaSampleConclusion[] {
  return removeBaSampleConclusionsMany(maBenhAn, [sampleId]);
}

/** Gỡ nhiều KL mẫu (vd. khi xóa phiên phân tích). */
export function removeBaSampleConclusionsMany(
  maBenhAn: string,
  sampleIds: readonly string[],
): BaSampleConclusion[] {
  const keys = new Set(
    sampleIds.map((id) => normalizeSampleId(id)).filter(Boolean),
  );
  if (!keys.size) return loadBaSampleConclusions(maBenhAn);
  const list = filterOutSampleConclusions(
    loadBaSampleConclusions(maBenhAn),
    keys,
  );
  saveBaSampleConclusions(maBenhAn, list);
  return list;
}

/** Pure — lọc sổ KL theo id (test / preview). */
export function filterOutSampleConclusions(
  rows: BaSampleConclusion[],
  sampleIdKeys: ReadonlySet<string>,
): BaSampleConclusion[] {
  if (!sampleIdKeys.size) return rows;
  return rows.filter((r) => !sampleIdKeys.has(normalizeSampleId(r.sampleId)));
}

/**
 * Id mẫu cần gỡ KL khi xóa phiên: Index + ritAttributed + bloodCriterionIds.
 */
export function sampleIdsOwnedByAnalysisSession(session: {
  index: { id: string; kind?: string };
  draft?: {
    ritAttributedIds?: string[] | null;
    bloodCriterionIds?: string[] | null;
  };
}): string[] {
  const out = new Set<string>();
  const ix = String(session.index?.id || "").trim();
  if (ix) out.add(ix);
  for (const id of session.draft?.ritAttributedIds || []) {
    const t = String(id || "").trim();
    if (t) out.add(t);
  }
  for (const id of session.draft?.bloodCriterionIds || []) {
    const t = String(id || "").trim();
    if (t) out.add(t);
  }
  return [...out];
}

/** Gộp sổ local → hàng disposition để cột Kết luận / chip Đã PT đọc chung. */
export function sampleConclusionsToDispositionRows(
  rows: BaSampleConclusion[],
): Array<{
  index_vi_sinh_id: string;
  analysis_disposition: "KHONG_DU_TC" | "DA_PHAN_TICH";
  is_active: true;
}> {
  return rows
    .filter(
      (r) =>
        r.kind === "XN" &&
        (r.disposition === "KHONG_DU_TC" || r.disposition === "SECONDARY_BSI"),
    )
    .map((r) => ({
      index_vi_sinh_id: normalizeSampleId(r.sampleId),
      analysis_disposition:
        r.disposition === "SECONDARY_BSI"
          ? ("DA_PHAN_TICH" as const)
          : ("KHONG_DU_TC" as const),
      is_active: true as const,
    }));
}
