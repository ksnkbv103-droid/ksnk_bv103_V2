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

export function nextStationLabel(current: Station): string {
  const i = stepIndex(current);
  if (i < 0) return "—";
  const n = WORKFLOW_STEPS[i + 1];
  if (!n) return "Hoàn chu kỳ (sau Cấp phát có thể tiếp nhận vòng sau).";
  if (n === "TIET_KHUAN") {
    return "Mẻ tiệt khuẩn — tạo phiếu tại CSSD → Mẻ TK rồi quét bộ trong màn phiếu.";
  }
  return n.replace(/_/g, " ");
}
