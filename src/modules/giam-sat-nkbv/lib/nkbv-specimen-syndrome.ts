/**
 * Map bệnh phẩm / Index → bảng phân tích hội chứng (ba-multi-timeline-architecture.md).
 *
 * Hợp đồng mở phiên:
 * - Index hợp lệ = XN (map bệnh phẩm) | CĐHA phổi/áp xe | ngày mổ | TC DOE SSI trong tiêu chuẩn
 * - Máu → Primary BSI chỉ khi không còn phiên site khu trú (Secondary-before-CLABSI)
 * - Không mở phiên từ triệu chứng LS hội chứng / free-text ngoài catalog SSI
 */

import { resolveNkbvMajorType, type NkbvMajorType } from "./nkbv-major-type";
import { isNkbvCh17SpecimenOnly } from "./nkbv-specimen-canonical";
import type {
  BaGridActiveIndex,
  BaGridCdhaCell,
  BaGridNghiNgo,
  BaGridSymptomByDate,
  BaGridXnCell,
} from "./nkbv-ba-grid-engine";
import { SSI_DIAGNOSTIC_CRITERIA_KEYS } from "./nkbv-ba-grid-engine";
import type { ViSinhAnalysisStatus } from "./nkbv-vi-sinh-analysis-status";

export type SyndromePanelId = "PNEU" | "UTI" | "BSI" | "VAE" | "SSI";

const SITE_PANELS: ReadonlySet<SyndromePanelId> = new Set([
  "PNEU",
  "UTI",
  "SSI",
  "VAE",
]);

/** Gợi ý mở phiên — chỉ từ Index hợp lệ trên bảng chung. */
export type SessionIndexSuggestion = {
  /** Khóa UI = `${panel}:${index.id}` (khớp sessionIdForIndex). */
  id: string;
  panel: SyndromePanelId;
  index: BaGridActiveIndex;
  label: string;
  source: "XN" | "CDHA" | "SSI_TC" | "SURGERY";
};

export function specimenToSyndromePanel(input: {
  loai_benh_pham?: string | null;
  loai_benh_pham_chuan?: string | null;
  lis_goc?: string | null;
  preferVae?: boolean;
}): SyndromePanelId | null {
  if (isNkbvCh17SpecimenOnly(input)) return null;
  const major = resolveNkbvMajorType({
    loai_benh_pham: input.loai_benh_pham,
    loai_benh_pham_chuan: input.loai_benh_pham_chuan,
  });
  if (major === "UTI") return "UTI";
  if (major === "SSI") return "SSI";
  if (major === "VAE") return "VAE";
  if (major === "PNEU") return input.preferVae ? "VAE" : "PNEU";
  if (major === "BSI") return "BSI";
  return null;
}

/** CĐHA → panel Index: phổi → PNEU/VAE; áp xe → SSI; còn lại không phải Index. */
export function cdhaToSyndromePanel(input: {
  tieu_chuan_key?: string | null;
  preferVae?: boolean;
}): SyndromePanelId | null {
  const key = String(input.tieu_chuan_key || "imaging_chest").trim();
  if (key === "abscess_imaging") return "SSI";
  if (key === "imaging_chest") return input.preferVae ? "VAE" : "PNEU";
  return null;
}

/** Ngày mổ hoặc TC DOE SSI trong catalog — mới được neo phiên SSI. */
export function isSsiIndexCriteriaKey(key: string | null | undefined): boolean {
  const k = String(key || "").trim();
  return k === "procedure_surgery" || SSI_DIAGNOSTIC_CRITERIA_KEYS.has(k);
}

export function isSiteSyndromePanel(panel: SyndromePanelId | null | undefined): boolean {
  return panel != null && SITE_PANELS.has(panel);
}

/** Phiên site đầu tiên còn mở (không phải BSI) — cổng Secondary. */
export function firstActiveSitePanel(
  panels: Array<SyndromePanelId | null | undefined>,
): SyndromePanelId | null {
  for (const p of panels) {
    if (isSiteSyndromePanel(p)) return p as SyndromePanelId;
  }
  return null;
}

/**
 * Dựng danh sách gợi ý phiên từ bằng chứng bảng chung — đúng map domain.
 * Mặc định chỉ liệt kê XN còn «Chưa PT» (hàng đợi phân tích).
 */
export function buildSessionIndexSuggestions(input: {
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  surgeryByDate: BaGridSymptomByDate;
  ssiTcByDate: BaGridSymptomByDate;
  preferVae?: boolean;
  /** Trạng thái hàng đợi XN — khi có, mặc định chỉ gợi ý CHUA_PHAN_TICH. */
  xnStatusById?: Record<string, ViSinhAnalysisStatus>;
  /** false = liệt kê cả XN đã PT/bỏ qua (mặc định true khi có xnStatusById). */
  onlyPendingXn?: boolean;
}): SessionIndexSuggestion[] {
  const out: SessionIndexSuggestion[] = [];
  const seen = new Set<string>();
  const onlyPending =
    input.onlyPendingXn ?? Boolean(input.xnStatusById);

  const push = (s: Omit<SessionIndexSuggestion, "id">) => {
    const id = `${s.panel}:${s.index.id}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ ...s, id });
  };

  for (const x of input.xn) {
    if (!x.id || x.id.startsWith("local-")) continue;
    if (onlyPending && input.xnStatusById) {
      const st = input.xnStatusById[x.id] || "CHUA_PHAN_TICH";
      if (st !== "CHUA_PHAN_TICH") continue;
    }
    const panel = specimenToSyndromePanel({
      loai_benh_pham: x.benh_pham,
      loai_benh_pham_chuan: x.loai_benh_pham_chuan,
      lis_goc: x.lis_goc,
      preferVae: input.preferVae,
    });
    if (!panel) continue;
    const label =
      [x.benh_pham, x.vi_khuan].filter(Boolean).join(" · ") || x.benh_pham || "XN";
    push({
      panel,
      index: { kind: "XN", id: x.id, date: x.ngay.slice(0, 10) },
      label,
      source: "XN",
    });
  }

  for (const c of input.cdha) {
    if (!c.id || c.id.startsWith("local-")) continue;
    const panel = cdhaToSyndromePanel({
      tieu_chuan_key: c.tieu_chuan_key,
      preferVae: input.preferVae,
    });
    if (!panel) continue;
    const date = c.ngay.slice(0, 10);
    push({
      panel,
      index: { kind: "CDHA", id: c.id, date },
      label:
        c.mo_ta_benh_ly ||
        (panel === "SSI" ? "Áp xe / CĐHA SSI" : "CĐHA phổi"),
      source: "CDHA",
    });
  }

  for (const [date, items] of Object.entries(input.surgeryByDate)) {
    for (const s of items) {
      if (!s.id || s.id.startsWith("local-")) continue;
      push({
        panel: "SSI",
        index: { kind: "TIEU_CHUAN", id: s.id, date: date.slice(0, 10) },
        label: s.label || "Ngày phẫu thuật",
        source: "SURGERY",
      });
    }
  }

  for (const [date, items] of Object.entries(input.ssiTcByDate)) {
    for (const t of items) {
      if (!t.id || t.id.startsWith("local-")) continue;
      if (!isSsiIndexCriteriaKey(t.key)) continue;
      if (t.key === "procedure_surgery") continue; // đã từ surgeryByDate
      push({
        panel: "SSI",
        index: { kind: "TIEU_CHUAN", id: t.id, date: date.slice(0, 10) },
        label: t.label || t.key,
        source: "SSI_TC",
      });
    }
  }

  out.sort((a, b) => {
    const d = a.index.date.localeCompare(b.index.date);
    if (d !== 0) return d;
    return a.panel.localeCompare(b.panel);
  });
  return out;
}

export function nghiNgoFromPanel(panel: SyndromePanelId): BaGridNghiNgo {
  return panel;
}

export function majorTypeFromPanel(panel: SyndromePanelId): NkbvMajorType {
  return panel;
}

/**
 * Chỉ phân tích Primary BSI khi máu **không** nằm trong SBAP của ổ tại chỗ đã đủ TC.
 * `establishedSiteSbaps` = cửa sổ SBAP từ phiếu đã chốt + phiên site đang PT đủ TC.
 * (Không còn chặn thô chỉ vì còn phiên site chưa đủ TC / máu ngoài SBAP.)
 */
export function shouldDeferPrimaryBsi(input: {
  selectedSpecimenPanel: SyndromePanelId | null;
  /** Ngày lấy máu (Index). */
  bloodDate?: string | null;
  /** SBAP các site đủ TC (prior + phiên đang PT). */
  establishedSiteSbaps?: Array<{ start: string; end: string }>;
  /**
   * @deprecated Chỉ dùng khi chưa truyền `establishedSiteSbaps` — giữ tương thích test cũ.
   * Prefer truyền SBAP thật.
   */
  activeSitePanel?: SyndromePanelId | null;
}): boolean {
  if (input.selectedSpecimenPanel !== "BSI") return false;
  const blood = (input.bloodDate || "").slice(0, 10);
  const windows = input.establishedSiteSbaps;
  if (windows && windows.length > 0) {
    if (!blood) return false;
    return windows.some((w) => {
      const s = w.start.slice(0, 10);
      const e = w.end.slice(0, 10);
      return Boolean(s && e && blood >= s && blood <= e);
    });
  }
  return isSiteSyndromePanel(input.activeSitePanel ?? null);
}

/** Gom cửa sổ SBAP từ danh sách site PrimarySiteForSbap. */
export function siteSbapWindowsFromSites(
  sites: Array<{ sbapDates: string[]; criteriaMet?: boolean }>,
): Array<{ start: string; end: string }> {
  const out: Array<{ start: string; end: string }> = [];
  for (const s of sites) {
    if (s.criteriaMet === false) continue;
    const dates = [...s.sbapDates].map((d) => d.slice(0, 10)).filter(Boolean).sort();
    if (!dates.length) continue;
    out.push({ start: dates[0]!, end: dates[dates.length - 1]! });
  }
  return out;
}
