/**
 * Hợp đồng module Quản lý công việc (Contract-first) - V2.2
 * Nguồn chân lý: CHECK `fact_cong_viec` (migration `20260716005_qlcv_track_b_trang_thai_codes.sql`).
 *
 * Quy tắc: Tên trường = tên cột DB, KHÔNG có tiền tố ma_/ten_/ngay_.
 */

// ---------- Bảng fact_cong_viec ----------
export interface CongViec {
  id: string;
  tieu_de: string;
  mo_ta?: string | null;
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien: "THAP" | "TRUNG_BINH" | "CAO";
  trang_thai: "MOI" | "DANG_LAM" | "CHO_DUYET" | "HOAN_THANH" | "TU_CHOI" | "QUA_HAN" | "DA_HUY";
  han_hoan_thanh?: string | null;
  phan_tram_hoan_thanh: number;

  nguoi_tao_id?: string | null;
  nguoi_giao_viec_id?: string | null;
  nguoi_phu_trach_id?: string | null;
  khoa_thuc_hien_id?: string | null;
  to_cong_tac_id?: string | null;
  cong_viec_cha_id?: string | null;

  created_at: string;
  updated_at: string;
}

// ---------- View v_fact_cong_viec_full (thêm join) ----------
export interface CongViecView extends CongViec {
  nguoi_tao_ten?: string | null;
  nguoi_giao_ten?: string | null;
  nguoi_phu_trach_ten?: string | null;
  khoa_thuc_hien_ten?: string | null;
  to_cong_tac_ten?: string | null;
  is_qua_han?: boolean;
  cong_viec_con_count?: number;
}

// ---------- Input tạo/sửa (từ Form → Action) ----------
export interface CongViecInput {
  tieu_de: string;
  mo_ta?: string | null;
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien?: "THAP" | "TRUNG_BINH" | "CAO";
  han_hoan_thanh?: string | null;
  nguoi_phu_trach_id?: string | null;
  khoa_thuc_hien_id?: string | null;
  to_cong_tac_id?: string | null;
  cong_viec_cha_id?: string | null;
}

// ---------- Đánh giá tháng QLCV (fact_qlcv_danh_gia_thang + RPC) ----------
/** Dòng trả về từ RPC `fn_qlcv_tong_hop_thang` (phiếu gốc trong tháng). */
export interface QlcvRpcMonthlyRow {
  nhan_su_id: string;
  ho_ten: string;
  phieu_trong_thang: number;
  hoan_thanh_trong_thang: number;
  dung_han: number;
  on_time_pct: number;
  completion_pct: number;
}

/** KPI + đánh giá đã merge (RPC + `fact_qlcv_danh_gia_thang`). */
export interface QlcvMonthlyEvalRow {
  id?: string;
  nhan_su_id: string;
  ho_ten: string;
  phieu_trong_thang: number;
  hoan_thanh_trong_thang: number;
  dung_han: number;
  on_time_pct: number;
  completion_pct: number;
  quality_score: number | null;
  final_score: number | null;
  manager_comment: string | null;
  evaluated_at: string | null;
}

// ---------- Bảng fact_cong_viec_hoat_dong ----------
export interface HoatDong {
  id: string;
  id_cong_viec: string;
  loai_hoat_dong:
    | "PHAN_CONG"
    | "DE_XUAT"
    | "BAO_CAO_TIEN_DO"
    | "PHE_DUYET"
    | "CAP_NHAT"
    | "HOAN_THANH"
    | "XAC_NHAN_NHAN"
    | "DUYET_HOAN_THANH"
    | "TU_CHOI_HOAN_THANH"
    | "GIA_HAN";
  nguoi_thuc_hien_id?: string | null;
  trang_thai?: string | null;
  noi_dung?: string | null;
  phan_tram_hoan_thanh: number;
  created_at: string;
}
