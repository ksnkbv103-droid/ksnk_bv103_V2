import { getQlcvWorkflowGateLabel, type CongViecLike } from "./qlcv-workflow-display";

export function formatMucDoUuTienLabel(code: string | null | undefined): string {
  const c = String(code || "TRUNG_BINH").trim().toUpperCase();
  if (c === "CAO") return "Ưu tiên cao";
  if (c === "THAP") return "Ưu tiên thấp";
  return "Ưu tiên trung bình";
}

/** Alias cổng workflow — thống nhất label giữa bảng, Kanban, chi tiết. */
export function getCongViecTrangThaiLabel(t: CongViecLike & { trang_thai?: string | null }): string {
  return getQlcvWorkflowGateLabel(t);
}
