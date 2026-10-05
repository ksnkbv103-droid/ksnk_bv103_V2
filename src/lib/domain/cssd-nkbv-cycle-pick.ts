/** Pure: chọn chu trình CSSD gần nhất trước (hoặc trong) ngày mổ theo cấp phát / dùng lâm sàng. */

export type CssdNkbvCyclePickCandidate = {
  id: string;
  thoiGianCapPhat: string | null;
  usedClinicallyAt: string | null;
};

export function cssdCycleAnchorYmd(candidate: CssdNkbvCyclePickCandidate): string | null {
  const used = normalizeYmd(candidate.usedClinicallyAt);
  if (used) return used;
  return normalizeYmd(candidate.thoiGianCapPhat);
}

export function normalizeYmd(raw: string | null | undefined): string | null {
  const ymd = String(raw || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/**
 * Trong các chu trình có mốc cấp phát/dùng ≤ ngày mổ, lấy mốc lớn nhất (gần mổ nhất).
 * Không có ứng viên hợp lệ → null.
 */
export function pickCssdCycleBySurgeryDate(
  candidates: CssdNkbvCyclePickCandidate[],
  surgeryDateYmd: string,
): CssdNkbvCyclePickCandidate | null {
  const surgery = normalizeYmd(surgeryDateYmd);
  if (!surgery || candidates.length === 0) return null;

  let best: CssdNkbvCyclePickCandidate | null = null;
  let bestAnchor = "";

  for (const c of candidates) {
    const anchor = cssdCycleAnchorYmd(c);
    if (!anchor || anchor > surgery) continue;
    if (!best || anchor > bestAnchor) {
      best = c;
      bestAnchor = anchor;
    }
  }

  return best;
}
