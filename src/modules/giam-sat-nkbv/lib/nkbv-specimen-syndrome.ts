/**
 * Map bệnh phẩm / Index → bảng phân tích hội chứng (ba-multi-timeline-architecture.md).
 */

import { resolveNkbvMajorType, type NkbvMajorType } from "./nkbv-major-type";
import type {
  BaGridActiveIndex,
  BaGridCdhaCell,
  BaGridNghiNgo,
  BaGridSymptomByDate,
  BaGridXnCell,
} from "./nkbv-ba-grid-engine";
import { SSI_DIAGNOSTIC_CRITERIA_KEYS } from "./nkbv-ba-grid-engine";

export type SyndromePanelId = "PNEU" | "UTI" | "BSI" | "VAE" | "SSI";

/** Gợi ý mở phiên — chỉ từ Index hợp lệ trên bảng chung (XN / CĐHA / TC DOE SSI / ngày mổ). */
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
  preferVae?: boolean;
}): SyndromePanelId | null {
  const major = resolveNkbvMajorType({ loai_benh_pham: input.loai_benh_pham });
  if (major === "UTI") return "UTI";
  if (major === "SSI") return "SSI";
  if (major === "VAE") return "VAE";
  if (major === "PNEU") return input.preferVae ? "VAE" : "PNEU";
  if (major === "BSI") return "BSI";
  return null;
}

/**
 * Dựng danh sách gợi ý phiên từ bằng chứng bảng chung — đúng map domain:
 * XN theo bệnh phẩm · CĐHA phổi→PNEU/VAE · áp xe→SSI · ngày mổ/TC SSI→SSI.
 * Không gợi ý từ triệu chứng LS hội chứng (không phải Index).
 */
export function buildSessionIndexSuggestions(input: {
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  surgeryByDate: BaGridSymptomByDate;
  ssiTcByDate: BaGridSymptomByDate;
  preferVae?: boolean;
}): SessionIndexSuggestion[] {
  const out: SessionIndexSuggestion[] = [];
  const seen = new Set<string>();

  const push = (s: Omit<SessionIndexSuggestion, "id">) => {
    const id = `${s.panel}:${s.index.id}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ ...s, id });
  };

  for (const x of input.xn) {
    if (!x.id || x.id.startsWith("local-")) continue;
    const panel = specimenToSyndromePanel({
      loai_benh_pham: x.benh_pham,
      preferVae: input.preferVae,
    });
    if (!panel) continue;
    const label = [x.benh_pham, x.vi_khuan].filter(Boolean).join(" · ") || x.benh_pham || "XN";
    push({
      panel,
      index: { kind: "XN", id: x.id, date: x.ngay.slice(0, 10) },
      label,
      source: "XN",
    });
  }

  for (const c of input.cdha) {
    if (!c.id || c.id.startsWith("local-")) continue;
    const date = c.ngay.slice(0, 10);
    const key = c.tieu_chuan_key || "imaging_chest";
    if (key === "abscess_imaging") {
      push({
        panel: "SSI",
        index: { kind: "CDHA", id: c.id, date },
        label: c.mo_ta_benh_ly || "Áp xe / CĐHA SSI",
        source: "CDHA",
      });
      continue;
    }
    // Chỉ CĐHA phổi là Index PNEU/VAE — không gợi ý từ CĐHA khác
    if (key !== "imaging_chest") continue;
    const panel: SyndromePanelId = input.preferVae ? "VAE" : "PNEU";
    push({
      panel,
      index: { kind: "CDHA", id: c.id, date },
      label: c.mo_ta_benh_ly || "CĐHA phổi",
      source: "CDHA",
    });
  }

  for (const [date, items] of Object.entries(input.surgeryByDate)) {
    for (const s of items) {
      if (!s.id) continue;
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
      // Chỉ TC trong tiêu chuẩn SSI (không free-text / không local tạm làm Index ảo)
      if (!t.id || t.id.startsWith("local-")) continue;
      if (!SSI_DIAGNOSTIC_CRITERIA_KEYS.has(t.key) && t.key !== "procedure_surgery") continue;
      if (t.key === "procedure_surgery") continue; // đã từ surgeryByDate
      push({
        panel: "SSI",
        index: { kind: "TIEU_CHUAN", id: t.id, date: date.slice(0, 10) },
        label: t.label || t.key,
        source: "SSI_TC",
      });
    }
  }

  // Sớm → muộn theo ngày Index, rồi theo panel
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

/** Máu không mở Primary BSI ngay khi đang có phiên site khu trú. */
export function shouldDeferPrimaryBsi(input: {
  selectedSpecimenPanel: SyndromePanelId | null;
  activeSitePanel: SyndromePanelId | null;
}): boolean {
  if (input.selectedSpecimenPanel !== "BSI") return false;
  const site = input.activeSitePanel;
  return site === "PNEU" || site === "UTI" || site === "SSI" || site === "VAE";
}
