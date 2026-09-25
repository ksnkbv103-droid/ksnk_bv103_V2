/**
 * SSOT: thứ tự trạm CSSD 6 bước + trạm được quét tay (TK chỉ qua phiếu mẻ).
 */
import type { Station } from "../../types/cssd.types";

export const WORKFLOW_STEPS: readonly Station[] = [
  "TIEP_NHAN",
  "LAM_SACH",
  "QC",
  "DONG_GOI",
  "TIET_KHUAN",
  "CAP_PHAT",
] as const;

export const SCAN_STATIONS: readonly Station[] = WORKFLOW_STEPS.filter((s) => s !== "TIET_KHUAN");

export function stepIndex(station: Station): number {
  return WORKFLOW_STEPS.indexOf(station);
}

export function previousWorkflowStation(station: Station): Station | null {
  const i = stepIndex(station);
  if (i <= 0) return null;
  return WORKFLOW_STEPS[i - 1] ?? null;
}

export function nextWorkflowStation(current: Station): Station | null {
  const i = stepIndex(current);
  if (i < 0) return null;
  return WORKFLOW_STEPS[i + 1] ?? null;
}

/** Short ambient next-step label — no teachy handoff paragraphs (P2-1 / page-chrome §7). */
export function nextStationLabel(current: Station): string {
  const i = stepIndex(current);
  if (i < 0) return "—";
  const n = WORKFLOW_STEPS[i + 1];
  if (!n) return "Hoàn chu kỳ";
  if (n === "TIET_KHUAN") return "Mẻ tiệt khuẩn";
  return n.replace(/_/g, " ");
}

/** After this station, sterilisation is via phiếu mẻ (not scan). */
export function nextIsMeHandoff(current: Station): boolean {
  return nextWorkflowStation(current) === "TIET_KHUAN";
}
