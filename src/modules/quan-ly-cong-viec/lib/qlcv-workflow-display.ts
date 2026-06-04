/**
 * Cổng nghiệp vụ QLCV (Track B lean): đề xuất | đang làm | chờ nghiệm thu | đóng.
 */

export type CongViecLike = {
  trang_thai?: string | null;
  is_active?: boolean | null;
  nguoi_phu_trach_id?: string | null;
  phan_tram_hoan_thanh?: number | null;
  tien_do?: number | null;
};

export function isDeXuatChoDuyet(t: CongViecLike): boolean {
  if (t.trang_thai === "DE_XUAT_CHO_DUYET") return true;
  return t.is_active === false && (t.trang_thai === "MOI" || t.trang_thai === "CHUA_BAT_DAU");
}

export function isChoNghiemThuHoanThanh(t: CongViecLike): boolean {
  if (t.trang_thai === "CHO_XAC_NHAN_HOAN_THANH" || t.trang_thai === "CHO_DUYET") return true;
  const pct = Number(t.phan_tram_hoan_thanh ?? t.tien_do ?? 0);
  return (t.trang_thai === "DANG_LAM" || t.trang_thai === "DANG_THUC_HIEN") && pct >= 100;
}

export type QlcvWorkflowGate =
  | "DE_XUAT"
  | "NGHIEM_THU"
  | "DANG_LAM"
  | "MOI"
  | "HOAN_THANH"
  | "QUA_HAN"
  | "DA_HUY"
  | "TU_CHOI";

export function getQlcvWorkflowGate(t: CongViecLike): QlcvWorkflowGate {
  if (isDeXuatChoDuyet(t)) return "DE_XUAT";
  if (isChoNghiemThuHoanThanh(t)) return "NGHIEM_THU";
  const st = String(t.trang_thai || "").trim().toUpperCase();
  if (st === "HOAN_THANH") return "HOAN_THANH";
  if (st === "DA_HUY") return "DA_HUY";
  if (st === "QUA_HAN") return "QUA_HAN";
  if (st === "TU_CHOI") return "TU_CHOI";
  if (st === "DANG_LAM" || st === "DANG_THUC_HIEN" || st === "CHO_NHAN_VIEC") return "DANG_LAM";
  if (t.is_active !== false && (st === "MOI" || st === "CHUA_BAT_DAU")) return "DANG_LAM";
  return "MOI";
}

const GATE_LABELS: Record<QlcvWorkflowGate, string> = {
  DE_XUAT: "Chờ phê đề xuất",
  NGHIEM_THU: "Chờ nghiệm thu",
  DANG_LAM: "Đang thực hiện",
  MOI: "Mới",
  HOAN_THANH: "Hoàn thành",
  QUA_HAN: "Quá hạn",
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
  QUA_HAN: "bg-red-50 text-red-800 border-red-100",
  DA_HUY: "bg-slate-100 text-slate-500 border-slate-200 line-through",
  TU_CHOI: "bg-rose-50 text-rose-800 border-rose-100",
};

export function getQlcvWorkflowGateBadgeClass(t: CongViecLike): string {
  return GATE_BADGE_CLASS[getQlcvWorkflowGate(t)];
}
