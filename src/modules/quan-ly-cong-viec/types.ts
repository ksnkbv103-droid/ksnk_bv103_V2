/**
 * Hợp đồng module Quản lý công việc (Contract-first) - V2.2
 * Nguồn chân lý: supabase/migrations/20260510002 + 20260510003
 *
 * Quy tắc: Tên trường = tên cột DB, KHÔNG có tiền tố ma_/ten_/ngay_.
 */

// ---------- Bảng fact_cong_viec ----------
export interface CongViec {
  id: string;
  tieu_de: string;
  mo_ta?: string | null;
  loai_pham_vi: "NOI_BO" | "MANG_LUOI";
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien: "THAP" | "TRUNG_BINH" | "CAO";
  trang_thai: "CHUA_BAT_DAU" | "DANG_THUC_HIEN" | "HOAN_THANH" | "QUA_HAN" | "DA_HUY";
  han_hoan_thanh?: string | null;
  phan_tram_hoan_thanh: number;

  nguoi_tao_id?: string | null;
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
  loai_pham_vi: "NOI_BO" | "MANG_LUOI";
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien?: "THAP" | "TRUNG_BINH" | "CAO";
  han_hoan_thanh?: string | null;
  nguoi_phu_trach_id?: string | null;
  khoa_thuc_hien_id?: string | null;
  to_cong_tac_id?: string | null;
  cong_viec_cha_id?: string | null;
}

// ---------- Bảng fact_cong_viec_hoat_dong ----------
export interface HoatDong {
  id: string;
  id_cong_viec: string;
  loai_hoat_dong: "PHAN_CONG" | "DE_XUAT" | "BAO_CAO_TIEN_DO" | "PHE_DUYET" | "CAP_NHAT" | "HOAN_THANH";
  nguoi_thuc_hien_id?: string | null;
  trang_thai?: string | null;
  noi_dung?: string | null;
  phan_tram_hoan_thanh: number;
  created_at: string;
}
