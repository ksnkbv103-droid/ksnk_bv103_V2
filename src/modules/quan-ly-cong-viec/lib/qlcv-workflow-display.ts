/**
 * Cổng nghiệp vụ QLCV (Track B lean): đề xuất | đang làm | chờ nghiệm thu | đóng.
 */

import { isEligibleForNghiemThu } from "@/lib/domain/qlcv/nghiem-thu-gate";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";

export type CongViecLike = {
  trang_thai?: string | null;
  is_active?: boolean | null;
  nguoi_phu_trach_id?: string | null;
  phan_tram_hoan_thanh?: number | null;
  loai_cong_viec?: string | null;
  han_hoan_thanh?: string | null;
  is_qua_han?: boolean | null;
};

export function isDeXuatChoDuyet(t: CongViecLike): boolean {
  if (t.trang_thai === "DE_XUAT_CHO_DUYET") return true;
  const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
  return t.is_active === false && st === "MOI";
}

export function isChoNghiemThuHoanThanh(t: CongViecLike): boolean {
  return isEligibleForNghiemThu(t);
}

export type QlcvWorkflowGate =
  | "DE_XUAT"
  | "NGHIEM_THU"
  | "DANG_LAM"
  | "MOI"
  | "HOAN_THANH"
  | "DA_HUY"
  | "TU_CHOI";

export function getQlcvWorkflowGate(t: CongViecLike): QlcvWorkflowGate {
  if (isDeXuatChoDuyet(t)) return "DE_XUAT";
  if (isChoNghiemThuHoanThanh(t)) return "NGHIEM_THU";
  const st = normalizeQlcvTrangThaiToCanonical(t.trang_thai);
  if (st === "HOAN_THANH") return "HOAN_THANH";
  if (st === "DA_HUY") return "DA_HUY";
  if (st === "TU_CHOI") return "TU_CHOI";
  if (st === "DANG_LAM" || st === "QUA_HAN") return "DANG_LAM";
  if (t.is_active !== false && st === "MOI") return "DANG_LAM";
  return "MOI";
}

const GATE_LABELS: Record<QlcvWorkflowGate, string> = {
  DE_XUAT: "Chờ phê đề xuất",
  NGHIEM_THU: "Chờ nghiệm thu",
  DANG_LAM: "Đang thực hiện",
  MOI: "Mới",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
  TU_CHOI: "Làm lại (từ chối NT)",
};

export function getQlcvWorkflowGateLabel(t: CongViecLike): string {
  return GATE_LABELS[getQlcvWorkflowGate(t)];
}

const GATE_BADGE_CLASS: Record<QlcvWorkflowGate, string> = {
  DE_XUAT: "bg-violet-50 text-violet-800 border-violet-100",
  NGHIEM_THU: "bg-orange-50 text-orange-800 border-orange-100",
  DANG_LAM: "bg-amber-50 text-amber-800 border-amber-100",
  MOI: "bg-slate-50 text-slate-700 border-slate-200",
  HOAN_THANH: "bg-emerald-50 text-emerald-800 border-emerald-100",
  DA_HUY: "bg-slate-100 text-slate-500 border-slate-200 line-through",
  TU_CHOI: "bg-rose-50 text-rose-800 border-rose-100",
};

export function getQlcvWorkflowGateBadgeClass(t: CongViecLike): string {
  return GATE_BADGE_CLASS[getQlcvWorkflowGate(t)];
}
