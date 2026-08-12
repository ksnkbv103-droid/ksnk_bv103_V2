/**
 * Chế độ phân tích BA: CDC (máy gợi ý KL) vs MANUAL (IP tự KL).
 */

export type BaAnalysisMode = "CDC" | "MANUAL";

export const BA_ANALYSIS_MODE_DEFAULT: BaAnalysisMode = "CDC";

const PREF_PREFIX = "nkbv-ba-analysis-mode:";

export function isBaAnalysisMode(v: unknown): v is BaAnalysisMode {
  return v === "CDC" || v === "MANUAL";
}

export function parseBaAnalysisMode(
  v: unknown,
  fallback: BaAnalysisMode = BA_ANALYSIS_MODE_DEFAULT,
): BaAnalysisMode {
  return isBaAnalysisMode(v) ? v : fallback;
}

/** Preference UI theo mã BA (sessionStorage). */
export function analysisModePrefKey(maBenhAn: string): string {
  return `${PREF_PREFIX}${String(maBenhAn || "").trim()}`;
}

export function loadBaAnalysisModePref(maBenhAn: string): BaAnalysisMode {
  if (typeof window === "undefined") return BA_ANALYSIS_MODE_DEFAULT;
  try {
    const raw = window.sessionStorage.getItem(analysisModePrefKey(maBenhAn));
    return parseBaAnalysisMode(raw);
  } catch {
    return BA_ANALYSIS_MODE_DEFAULT;
  }
}

export function saveBaAnalysisModePref(maBenhAn: string, mode: BaAnalysisMode) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(analysisModePrefKey(maBenhAn), mode);
  } catch {
    /* private mode */
  }
}

export function isManualAnalysisMode(mode: BaAnalysisMode | null | undefined): boolean {
  return mode === "MANUAL";
}

/** MANUAL: chỉ hiện chữ IP gõ — không progressive/smart/disposition label. */
export function resolveManualKetLuanDisplay(draftKetLuan: string | null | undefined): string {
  return String(draftKetLuan || "").trim() ? String(draftKetLuan) : "";
}
