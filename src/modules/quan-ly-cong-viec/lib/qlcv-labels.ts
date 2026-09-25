import { getQlcvWorkflowGateLabel, type CongViecLike } from "./qlcv-workflow-display";

/** CHECK loai_cong_viec — nhãn UI (không JOIN qlcv_dm_loai_cong_viec). */
export const QLCV_LOAI_CONG_VIEC_LABELS: Record<string, string> = {
  DINH_KY: "Định kỳ",
  DOT_XUAT: "Đột xuất",
  KHAN_CAP: "Khẩn cấp",
};

/**
 * mau_sac trạng thái — khớp sys_lookup_value TRANG_THAI_CONG_VIEC (prod 2026-09-26).
 * Canonical 7 + legacy alias còn trong seed.
 */
export const QLCV_TRANG_THAI_MAU_SAC: Record<string, string> = {
  MOI: "#94A3B8",
  DANG_LAM: "#3B82F6",
  CHO_DUYET: "#F59E0B",
  HOAN_THANH: "#10B981",
  TU_CHOI: "#EF4444",
  QUA_HAN: "#DC2626",
  DA_HUY: "#6B7280",
  // legacy alias (map → cùng màu canonical)
  CHUA_BAT_DAU: "#6B7280",
  DANG_THUC_HIEN: "#3B82F6",
  CHO_NHAN_VIEC: "#3B82F6",
  CHO_XAC_NHAN_HOAN_THANH: "#F59E0B",
};

/** Nhãn trạng thái canonical (đồng bộ seed; UI cổng vẫn dùng getQlcvWorkflowGateLabel). */
export const QLCV_TRANG_THAI_TEN: Record<string, string> = {
  MOI: "Mới",
  DANG_LAM: "Đang làm",
  CHO_DUYET: "Chờ nghiệm thu",
  HOAN_THANH: "Hoàn thành",
  TU_CHOI: "Từ chối",
  QUA_HAN: "Quá hạn",
  DA_HUY: "Đã hủy",
  CHUA_BAT_DAU: "Chưa bắt đầu",
  DANG_THUC_HIEN: "Đang thực hiện",
};

/** Bản sao map màu — hot path không query view. */
export function getQlcvTrangThaiMauSacMap(): Record<string, string> {
  return { ...QLCV_TRANG_THAI_MAU_SAC };
}

export function formatMucDoUuTienLabel(code: string | null | undefined): string {
  const c = String(code || "TRUNG_BINH").trim().toUpperCase();
  if (c === "CAO") return "Ưu tiên cao";
  if (c === "THAP") return "Ưu tiên thấp";
  return "Ưu tiên trung bình";
}

export function formatLoaiCongViecLabel(code: string | null | undefined): string {
  const c = String(code || "").trim().toUpperCase();
  if (c in QLCV_LOAI_CONG_VIEC_LABELS) return QLCV_LOAI_CONG_VIEC_LABELS[c];
  return c || "—";
}

/** Alias cổng workflow — thống nhất label giữa bảng, Kanban, chi tiết. */
export function getCongViecTrangThaiLabel(t: CongViecLike & { trang_thai?: string | null }): string {
  return getQlcvWorkflowGateLabel(t);
}
