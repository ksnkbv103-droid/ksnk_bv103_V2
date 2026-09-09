/**
 * Phiên phân tích BA — nháp.
 * Cache trình duyệt + bảng `nkbv_fact_ba_phan_tich` (máy chủ).
 * Key tách theo chế độ CDC | MANUAL để không lẫn draft KL.
 */

import type { BaAnalysisMode } from "./nkbv-ba-analysis-mode";
import { BA_ANALYSIS_MODE_DEFAULT, parseBaAnalysisMode } from "./nkbv-ba-analysis-mode";
import type { BaGridActiveIndex, BaGridNghiNgo, BaGridSymptomByDate } from "./nkbv-ba-grid-engine";
import type { SyndromePanelId } from "./nkbv-specimen-syndrome";

export type BaAnalysisSessionDraft = {
  lamSang: BaGridSymptomByDate;
  bloodCriterionIds: string[];
  ketLuan: string;
  notesByDate: Record<string, string>;
  /**
   * @deprecated Không dùng để giả đủ TC. Giữ field tương thích localStorage cũ.
   * Đủ TC lấy từ verdict engine (`eventEstablished`).
   */
  readyToChot: boolean;
  /** Engine đã đủ TC cấu thành sự kiện — tô RIT/SBAP + cho Tạo phiếu. */
  eventEstablished?: boolean;
  /** DOE/NSK phiên (để khóa RIT mẫu khác khi PT Index khác). */
  nsk?: string | null;
  /** Đã bấm «Đã phân tích xong» khi chưa đủ TC. */
  closedInsufficient?: boolean;
  canThiepDates: string[];
  /** PNEU Lớp 2 — bệnh tim phổi nền → cần ≥2 phim ∈ IWP. */
  hasCardiopulmonaryDisease?: boolean;
  /** PNEU Footnote 10 — atom miễn dịch trên BA. */
  pneuIcAtoms?: {
    pneu_ic_neutropenia?: boolean;
    pneu_ic_leukemia_lymphoma?: boolean;
    pneu_ic_hiv_cd4_lt_200?: boolean;
    pneu_ic_splenectomy?: boolean;
    pneu_ic_solid_organ_or_hsct?: boolean;
    pneu_ic_chemotherapy?: boolean;
    pneu_ic_steroid_ge_14d?: boolean;
  };
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
  /**
   * Quy kết lúc mở Index: thuộc sự kiện trước (RIT) / Secondary BSI (có thể đa site).
   * Seed `ketLuan` — không tạo phiếu trùng khi BELONGS_PRIOR.
   */
  eventDisposition?: {
    kind: "BELONGS_PRIOR_EVENT" | "SECONDARY_BSI" | "NEW_ANALYSIS";
    label: string;
    priorEventId?: string | null;
    secondarySites?: string[];
  } | null;
  /**
   * XN (và CĐHA) ∈ RIT của phiên đang phân tích — user đã bấm xác nhận «Đã phân tích».
   * Không khóa tạo phiếu Index; chỉ gắn attributed khi chốt phiếu.
   */
  ritAttributedIds?: string[];
  /** Chế độ phiên — CDC máy gợi ý / MANUAL IP tự KL. */
  analysisMode?: BaAnalysisMode;
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

function legacyStorageKey(maBenhAn: string) {
  return `nkbv-ba-session:${maBenhAn}`;
}

function storageKey(maBenhAn: string, mode: BaAnalysisMode) {
  return `nkbv-ba-session:${maBenhAn}:${mode}`;
}

function readSessionsRaw(key: string): BaAnalysisSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BaAnalysisSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessionsRaw(key: string, sessions: BaAnalysisSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(sessions));
  } catch {
    /* quota / private mode */
  }
}

export function loadBaAnalysisSessions(
  maBenhAn: string,
  mode: BaAnalysisMode = BA_ANALYSIS_MODE_DEFAULT,
): BaAnalysisSession[] {
  const keyed = readSessionsRaw(storageKey(maBenhAn, mode));
  if (keyed.length || mode !== "CDC") return keyed;
  // Migrate legacy (chưa có suffix mode) → CDC
  const legacy = readSessionsRaw(legacyStorageKey(maBenhAn));
  if (!legacy.length) return [];
  writeSessionsRaw(storageKey(maBenhAn, "CDC"), legacy);
  try {
    window.localStorage.removeItem(legacyStorageKey(maBenhAn));
  } catch {
    /* ignore */
  }
  return legacy;
}

export function saveBaAnalysisSessions(
  maBenhAn: string,
  sessions: BaAnalysisSession[],
  mode: BaAnalysisMode = BA_ANALYSIS_MODE_DEFAULT,
) {
  writeSessionsRaw(storageKey(maBenhAn, mode), sessions);
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
  mode?: BaAnalysisMode;
}): BaAnalysisSession[] {
  const mode = parseBaAnalysisMode(input.mode ?? input.draft?.analysisMode);
  const list = loadBaAnalysisSessions(input.maBenhAn, mode);
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
      draft: {
        ...prev.draft,
        ...(input.draft || {}),
        analysisMode: mode,
      },
    };
  } else {
    list.push({
      id,
      panel: input.panel,
      index: input.index,
      indexLabel: input.indexLabel,
      createdAt: now,
      updatedAt: now,
      draft: { ...emptyDraft(), ...(input.draft || {}), analysisMode: mode },
    });
  }
  saveBaAnalysisSessions(input.maBenhAn, list, mode);
  return list;
}

export function updateSessionDraft(
  maBenhAn: string,
  sessionId: string,
  draft: Partial<BaAnalysisSessionDraft>,
  mode: BaAnalysisMode = BA_ANALYSIS_MODE_DEFAULT,
): BaAnalysisSession[] {
  const list = loadBaAnalysisSessions(maBenhAn, mode);
  const idx = list.findIndex((s) => s.id === sessionId);
  if (idx < 0) return list;
  list[idx] = {
    ...list[idx],
    updatedAt: new Date().toISOString(),
    draft: { ...list[idx].draft, ...draft, analysisMode: mode },
  };
  saveBaAnalysisSessions(maBenhAn, list, mode);
  return list;
}

/** Xóa 1 phiên nháp (localStorage) — dọn phiên gợi ý sai / không còn Index. */
export function removeBaAnalysisSession(
  maBenhAn: string,
  sessionId: string,
  mode: BaAnalysisMode = BA_ANALYSIS_MODE_DEFAULT,
): BaAnalysisSession[] {
  const list = loadBaAnalysisSessions(maBenhAn, mode).filter((s) => s.id !== sessionId);
  saveBaAnalysisSessions(maBenhAn, list, mode);
  return list;
}

/** Giữ phiên có Index vẫn còn trên bảng chung (id XN/CĐHA/TC). */
export function pruneBaAnalysisSessions(
  maBenhAn: string,
  validIndexIds: Set<string>,
  mode: BaAnalysisMode = BA_ANALYSIS_MODE_DEFAULT,
): BaAnalysisSession[] {
  const list = loadBaAnalysisSessions(maBenhAn, mode).filter((s) =>
    validIndexIds.has(s.index.id),
  );
  saveBaAnalysisSessions(maBenhAn, list, mode);
  return list;
}

function sessionUpdatedMs(s: BaAnalysisSession): number {
  const t = Date.parse(s.updatedAt || s.createdAt || "");
  return Number.isFinite(t) ? t : 0;
}

/** Máy chủ thắng khi cùng id và updatedAt mới hơn hoặc bằng. */
export function mergeBaAnalysisSessions(
  server: BaAnalysisSession[],
  local: BaAnalysisSession[],
): BaAnalysisSession[] {
  const byId = new Map<string, BaAnalysisSession>();
  for (const s of local) {
    if (s?.id) byId.set(s.id, s);
  }
  for (const s of server) {
    if (!s?.id) continue;
    const prev = byId.get(s.id);
    if (!prev || sessionUpdatedMs(s) >= sessionUpdatedMs(prev)) {
      byId.set(s.id, s);
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function sessionsFromDbRows(
  rows: Array<{
    session_id?: string;
    panel?: string;
    index_payload?: unknown;
    index_label?: string;
    draft?: unknown;
    created_at?: string;
    updated_at?: string;
  }>,
): BaAnalysisSession[] {
  const out: BaAnalysisSession[] = [];
  for (const r of rows) {
    const id = String(r.session_id || "").trim();
    const index = r.index_payload && typeof r.index_payload === "object"
      ? (r.index_payload as BaAnalysisSession["index"])
      : null;
    if (!id || !index?.id || !index.date) continue;
    out.push({
      id,
      panel: String(r.panel || "UTI") as BaAnalysisSession["panel"],
      index,
      indexLabel: String(r.index_label || ""),
      createdAt: String(r.created_at || new Date().toISOString()),
      updatedAt: String(r.updated_at || new Date().toISOString()),
      draft: {
        ...emptyDraft(),
        ...(r.draft && typeof r.draft === "object" ? (r.draft as Partial<BaAnalysisSessionDraft>) : {}),
      },
    });
  }
  return out;
}

export function sessionToDbRow(
  s: BaAnalysisSession,
  maBenhAn: string,
  mode: BaAnalysisMode,
) {
  return {
    ma_benh_an: maBenhAn,
    session_id: s.id,
    analysis_mode: mode,
    panel: s.panel,
    index_payload: s.index,
    index_label: s.indexLabel,
    draft: s.draft,
  };
}

export function formatSessionChipLabel(s: BaAnalysisSession): string {
  const d = s.index.date.slice(0, 10);
  const [, m, day] = d.split("-");
  return `${s.panel} ${Number(day)}/${Number(m)} · ${s.indexLabel}`;
}

export function nghiNgoFromPanel(panel: SyndromePanelId): BaGridNghiNgo {
  return panel as BaGridNghiNgo;
}
