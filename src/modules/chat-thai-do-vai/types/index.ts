/**
 * Types & Domain Constants cho Module Quản lý Chất thải Y tế & Đồ vải Y tế (BV103).
 * Tuân thủ Kế hoạch v2 (tinh gọn) và quyết định PO 2026-11-05.
 */

export type LoaiMucSoCan =
  | "CT_LAY_NHIEM_SAC_NHON"
  | "CT_LAY_NHIEM_CON_LAI"
  | "CT_THONG_THUONG"
  | "DO_VAI_BAN_THUONG"
  | "DO_VAI_BAN_LAY_NHIEM"
  | "DO_VAI_SACH_VE";

export type PhanHeHauCan = "CHAT_THAI" | "DO_VAI";

export type LoaiSuCoHauCan =
  | "TUI_RACH"
  | "HOP_KHONG_DONG_NAP"
  | "PHAN_LOAI_SAI"
  | "LAN_SAC_NHON_DO_VAI"
  | "DO_VAI_RACH_HONG"
  | "KHAC";

export interface LoaiMucConfig {
  key: LoaiMucSoCan;
  phanHe: PhanHeHauCan;
  label: string;
  shortLabel: string;
  colorClass: string;
  badgeBg: string;
  moTa: string;
}

export const LOAI_MUC_CONFIGS: Record<LoaiMucSoCan, LoaiMucConfig> = {
  CT_LAY_NHIEM_SAC_NHON: {
    key: "CT_LAY_NHIEM_SAC_NHON",
    phanHe: "CHAT_THAI",
    label: "Chất thải lây nhiễm sắc nhọn",
    shortLabel: "CTLN sắc nhọn",
    colorClass: "text-amber-800",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    moTa: "Kim tiêm, bơm kim liền, lưỡi dao, vật sắc nhọn trong hộp kháng thủng màu vàng",
  },
  CT_LAY_NHIEM_CON_LAI: {
    key: "CT_LAY_NHIEM_CON_LAI",
    phanHe: "CHAT_THAI",
    label: "Chất thải lây nhiễm còn lại (gộp)",
    shortLabel: "CTLN không sắc/giải phẫu",
    colorClass: "text-amber-700",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    moTa: "Bông băng, gạc dính máu dịch, mô giải phẫu, nguy cơ cao trong túi/thùng vàng",
  },
  CT_THONG_THUONG: {
    key: "CT_THONG_THUONG",
    phanHe: "CHAT_THAI",
    label: "Chất thải thông thường (sinh hoạt)",
    shortLabel: "CT thông thường",
    colorClass: "text-emerald-700",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    moTa: "Rác sinh hoạt, bao bì giấy, chất thải không lây nhiễm túi xanh",
  },
  DO_VAI_BAN_THUONG: {
    key: "DO_VAI_BAN_THUONG",
    phanHe: "DO_VAI",
    label: "Đồ vải bẩn thông thường",
    shortLabel: "Đồ bẩn thường",
    colorClass: "text-sky-700",
    badgeBg: "bg-sky-50 text-sky-800 border-sky-200",
    moTa: "Đồ vải không dính máu dịch tiết buồng bệnh thường quy túi xanh/trắng",
  },
  DO_VAI_BAN_LAY_NHIEM: {
    key: "DO_VAI_BAN_LAY_NHIEM",
    phanHe: "DO_VAI",
    label: "Đồ vải bẩn lây nhiễm",
    shortLabel: "Đồ bẩn lây nhiễm",
    colorClass: "text-rose-700",
    badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
    moTa: "Đồ dính máu, dịch tiết, cách ly, mủ, săng mổ túi vàng hoặc tự tan PVA",
  },
  DO_VAI_SACH_VE: {
    key: "DO_VAI_SACH_VE",
    phanHe: "DO_VAI",
    label: "Đồ vải sạch nhận về (cấp phát)",
    shortLabel: "Đồ sạch về",
    colorClass: "text-teal-700",
    badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
    moTa: "Đồ vải đã giặt sấy là đạt chuẩn giao về các khoa phòng",
  },
};

export const LOAI_SU_CO_LABELS: Record<LoaiSuCoHauCan, { label: string; phanHe: PhanHeHauCan; isWarningRed?: boolean }> = {
  TUI_RACH: { label: "Túi rác/đồ vải rách, rò rỉ", phanHe: "CHAT_THAI" },
  HOP_KHONG_DONG_NAP: { label: "Hộp sắc nhọn không đóng nắp / quá 3/4", phanHe: "CHAT_THAI" },
  PHAN_LOAI_SAI: { label: "Phân loại sai thùng/túi tại khoa", phanHe: "CHAT_THAI" },
  LAN_SAC_NHON_DO_VAI: { label: "Phát hiện vật sắc nhọn lẫn trong đồ vải", phanHe: "DO_VAI", isWarningRed: true },
  DO_VAI_RACH_HONG: { label: "Đồ vải rách hỏng khi giao nhận", phanHe: "DO_VAI" },
  KHAC: { label: "Sự cố an toàn sinh học khác", phanHe: "CHAT_THAI" },
};

export interface SoCanRow {
  id: string;
  ngay_can: string; // YYYY-MM-DD
  loai_muc: LoaiMucSoCan;
  khoi_luong_kg: number;
  so_tui?: number | null;
  ghi_chu?: string | null;
  nguoi_ghi_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SuCoRow {
  id: string;
  ngay_ghi_nhan: string; // YYYY-MM-DD
  phan_he: PhanHeHauCan;
  loai_su_co: LoaiSuCoHauCan;
  khoa_lien_quan_id?: string | null;
  ten_khoa?: string | null;
  mo_ta?: string | null;
  nguoi_ghi_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NgayGiuongRow {
  id: string;
  nam: number;
  thang: number;
  so_ngay_giuong: number;
  ghi_chu?: string | null;
}

export interface ThongKeKyHauCan {
  tu_ngay: string;
  den_ngay: string;
  so_ngay_ky: number;
  so_ngay_co_du_lieu: number;
  ty_le_day_du_pct: number;
  tong_ngay_giuong: number;
  chat_thai: {
    kg_sac_nhon: number;
    kg_con_lai: number;
    kg_thong_thuong: number;
    tong_ctln_kg: number;
    tong_chat_thai_kg: number;
    ty_le_ctln_pct: number;
    chat_thai_per_1000_ngay_giuong: number;
    so_su_co: number;
  };
  do_vai: {
    kg_ban_thuong: number;
    kg_ban_lay_nhiem: number;
    tong_ban_kg: number;
    ty_le_ban_ln_pct: number;
    kg_sach_ve: number;
    chenh_lech_kg: number;
    ty_le_chenh_lech_pct: number;
    do_vai_per_1000_ngay_giuong: number;
    so_su_co_chung: number;
    so_su_co_sac_nhon: number;
  };
}
