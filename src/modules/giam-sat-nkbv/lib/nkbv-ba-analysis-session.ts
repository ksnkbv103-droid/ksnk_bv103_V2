/**
 * Phiên phân tích BA — nháp localStorage (không bảng summary DB).
 */

import type { BaGridActiveIndex, BaGridNghiNgo, BaGridSymptomByDate } from "./nkbv-ba-grid-engine";
import type { SyndromePanelId } from "./nkbv-specimen-syndrome";

export type BaAnalysisSessionDraft = {
  lamSang: BaGridSymptomByDate;
  bloodCriterionIds: string[];
  ketLuan: string;
  notesByDate: Record<string, string>;
  readyToChot: boolean;
  canThiepDates: string[];
  /** PNEU Lớp 2 — bệnh tim phổi nền → cần ≥2 phim ∈ IWP. */
  hasCardiopulmonaryDisease?: boolean;
  /** SSI — độ sâu / mã NHSN / PATOS. */
  ssiDepth?: "SUPERFICIAL" | "DEEP" | "ORGAN_SPACE";
  hasImplant?: boolean;
  isPatos?: boolean;
  loaiPhauThuatNhsn?: string;
  ssiEventType?: string;
  organSpaceSite?: string;
  /** BSI — ngữ cảnh site khu trú khi mở Primary (Secondary-before-CLABSI). */
  bsiLocalizedSite?: {
    majorType: "UTI" | "PNEU" | "SSI" | "VAE" | "OTHER";
    criteriaMet: boolean;
    siteOrganism?: string | null;
    siteIndexDate?: string;
    siteDoe?: string;
    sbapStart?: string;
    sbapEnd?: string;
    bloodMandatory?: boolean;
  } | null;
};

export type BaAnalysisSession = {
  id: string;
  panel: SyndromePanelId;
  index: BaGridActiveIndex;
  indexLabel: string;
  createdAt: string;
  updatedAt: string;
  draft: BaAnalysisSessionDraft;
};

const emptyDraft = (): BaAnalysisSessionDraft => ({
  lamSang: {},
  bloodCriterionIds: [],
  ketLuan: "",
  notesByDate: {},
  readyToChot: false,
  canThiepDates: [],
});

function storageKey(maBenhAn: string) {
  return `nkbv-ba-session:${maBenhAn}`;
}

export function loadBaAnalysisSessions(maBenhAn: string): BaAnalysisSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(maBenhAn));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BaAnalysisSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBaAnalysisSessions(maBenhAn: string, sessions: BaAnalysisSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(maBenhAn), JSON.stringify(sessions));
  } catch {
    /* quota / private mode */
  }
}

export function sessionIdForIndex(panel: SyndromePanelId, indexId: string) {
  return `${panel}:${indexId}`;
}

export function upsertBaAnalysisSession(input: {
  maBenhAn: string;
  panel: SyndromePanelId;
  index: BaGridActiveIndex;
  indexLabel: string;
  draft?: Partial<BaAnalysisSessionDraft>;
}): BaAnalysisSession[] {
  const list = loadBaAnalysisSessions(input.maBenhAn);
  const id = sessionIdForIndex(input.panel, input.index.id);
  const now = new Date().toISOString();
  const idx = list.findIndex((s) => s.id === id);
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      panel: input.panel,
      index: input.index,
      indexLabel: input.indexLabel,
      updatedAt: now,
      draft: { ...prev.draft, ...(input.draft || {}) },
    };
  } else {
    list.push({
      id,
      panel: input.panel,
      index: input.index,
      indexLabel: input.indexLabel,
      createdAt: now,
      updatedAt: now,
      draft: { ...emptyDraft(), ...(input.draft || {}) },
    });
  }
  saveBaAnalysisSessions(input.maBenhAn, list);
  return list;
}

export function updateSessionDraft(
  maBenhAn: string,
  sessionId: string,
  draft: Partial<BaAnalysisSessionDraft>,
): BaAnalysisSession[] {
  const list = loadBaAnalysisSessions(maBenhAn);
  const idx = list.findIndex((s) => s.id === sessionId);
  if (idx < 0) return list;
  list[idx] = {
    ...list[idx],
    updatedAt: new Date().toISOString(),
    draft: { ...list[idx].draft, ...draft },
  };
  saveBaAnalysisSessions(maBenhAn, list);
  return list;
}

/** Xóa 1 phiên nháp (localStorage) — dọn phiên gợi ý sai / không còn Index. */
export function removeBaAnalysisSession(
  maBenhAn: string,
  sessionId: string,
): BaAnalysisSession[] {
  const list = loadBaAnalysisSessions(maBenhAn).filter((s) => s.id !== sessionId);
  saveBaAnalysisSessions(maBenhAn, list);
  return list;
}

/** Giữ phiên có Index vẫn còn trên bảng chung (id XN/CĐHA/TC). */
export function pruneBaAnalysisSessions(
  maBenhAn: string,
  validIndexIds: Set<string>,
): BaAnalysisSession[] {
  const list = loadBaAnalysisSessions(maBenhAn).filter((s) =>
    validIndexIds.has(s.index.id),
  );
  saveBaAnalysisSessions(maBenhAn, list);
  return list;
}

export function formatSessionChipLabel(s: BaAnalysisSession): string {
  const d = s.index.date.slice(0, 10);
  const [, m, day] = d.split("-");
  return `${s.panel} ${Number(day)}/${Number(m)} · ${s.indexLabel}`;
}

export function nghiNgoFromPanel(panel: SyndromePanelId): BaGridNghiNgo {
  return panel as BaGridNghiNgo;
}
