/**
 * Tiny helpers for VAE/shell syndrome panel — kept out of NkbvSyndromeShellPanel
 * so MultiTimeline can call them without eagerly loading the ~265-line panel chunk.
 */
import type { BaAnalysisSessionDraft } from "./nkbv-ba-analysis-session";
import type { SyndromePanelId } from "./nkbv-specimen-syndrome";

export function isVaeClassLabel(label: string): boolean {
  const t = label.trim().toUpperCase();
  return t === "VAC" || t === "IVAC" || t === "PVAP" || /\b(VAC|IVAC|PVAP)\b/.test(t);
}

export function isShellPanel(panel: SyndromePanelId): panel is "VAE" {
  return panel === "VAE";
}

/** Tạo phiếu VAE chỉ khi đã chọn lớp VAC/IVAC/PVAP trên lưới. */
export function vaeBaReadyToCreatePhieu(draft: BaAnalysisSessionDraft): boolean {
  return Boolean(draft.eventEstablished) || isVaeClassLabel(draft.ketLuan || "");
}
