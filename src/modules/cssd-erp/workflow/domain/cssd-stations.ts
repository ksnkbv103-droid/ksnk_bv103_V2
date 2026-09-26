/**
 * SSOT: 6 mã trạm CSSD + nhãn VI + thứ tự workflow.
 * Persist fact vẫn FK UUID (`tram_hien_tai_id`) qua `cssd-tram-persist` — CODE là khóa nghiệp vụ.
 * Admin không thêm trạm thứ 7 (TRAM_CSSD khóa hệ thống).
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

/** Nhãn hiển thị — một map duy nhất; UI/in/analytics đọc từ đây. */
export const STATION_LABEL: Record<Station, string> = {
  TIEP_NHAN: "Tiếp nhận",
  LAM_SACH: "Làm sạch",
  QC: "Kiểm bộ",
  DONG_GOI: "Đóng gói",
  TIET_KHUAN: "Tiệt khuẩn",
  CAP_PHAT: "Cấp phát",
};

export const SCAN_STATIONS: readonly Station[] = WORKFLOW_STEPS.filter((s) => s !== "TIET_KHUAN");

export function isCssdStation(value: string): value is Station {
  return (WORKFLOW_STEPS as readonly string[]).includes(value.trim().toUpperCase());
}

export function stationLabel(station: string | null | undefined): string {
  const ma = String(station || "").trim().toUpperCase();
  if (!ma) return "—";
  if (isCssdStation(ma)) return STATION_LABEL[ma];
  return ma.replace(/_/g, " ");
}

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
  return STATION_LABEL[n];
}

/** After this station, sterilisation is via phiếu mẻ (not scan). */
export function nextIsMeHandoff(current: Station): boolean {
  return nextWorkflowStation(current) === "TIET_KHUAN";
}
