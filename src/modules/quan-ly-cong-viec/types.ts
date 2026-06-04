/**
 * Hợp đồng module Quản lý công việc (Contract-first).
 * SSOT: `qlcv_fact_cong_viec` (ghi/đọc); list UI: `v_qlcv_cong_viec_full`.
 * Trạng thái runtime: cột `trang_thai` text + CHECK.
 *
 * Quy tắc: Tên trường = tên cột DB, KHÔNG có tiền tố ma_/ten_/ngay_.
 */

/**
 * Mã trạng thái trên view (sys_lookup_value.code).
 * - MOI / CHUA_BAT_DAU: mới / chưa bắt đầu (alias)
 * - CHO_NHAN_VIEC: alias legacy — UI lean gộp vào DANG_LAM khi đã giao phụ trách
 * - DANG_LAM / DANG_THUC_HIEN: đang thực hiện (alias)
 * - CHO_DUYET / CHO_XAC_NHAN_HOAN_THANH: đã báo 100%, chờ nghiệm thu
 * - TU_CHOI: bị từ chối nghiệm thu, cần làm lại
 * - HOAN_THANH: đã nghiệm thu và đóng
 * - QUA_HAN: đã qua hạn hoàn thành mà chưa xong
 * - DA_HUY: bị hủy (không hoàn thành)
 * - DE_XUAT_CHO_DUYET: trạng thái virtual (is_active=false, trang_thai=MOI) — không lưu DB
 */
export type CongViecTrangThai =
  | "MOI"
  | "CHUA_BAT_DAU"
  | "CHO_NHAN_VIEC"
  | "DANG_LAM"
  | "DANG_THUC_HIEN"
  | "CHO_DUYET"
  | "CHO_XAC_NHAN_HOAN_THANH"
  | "TU_CHOI"
  | "HOAN_THANH"
  | "QUA_HAN"
  | "DA_HUY"
  | "DE_XUAT_CHO_DUYET"; // virtual — chỉ dùng cho UI/display logic

// ---------- Bảng qlcv_fact_cong_viec ----------
export interface CongViec {
  id: string;
  tieu_de: string;
  mo_ta?: string | null;
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien: "THAP" | "TRUNG_BINH" | "CAO";
  trang_thai: CongViecTrangThai;
  han_hoan_thanh?: string | null;
  phan_tram_hoan_thanh: number;
  /** Set bởi trigger DB khi nghiệm thu (HOAN_THANH). */
  hoan_thanh_luc?: string | null;
  /** Tăng bởi trigger DB khi gia hạn hạn hoàn thành. */
  gia_han_so_lan?: number;

  nguoi_tao_id?: string | null;
  nguoi_giao_viec_id?: string | null;
  nguoi_phu_trach_id?: string | null;
  khoa_thuc_hien_id?: string | null;
  to_cong_tac_id?: string | null;
  /** Mục tick 1 chạm — [{ id, label, done }] */
  checklist?: unknown;

  created_at: string;
  updated_at: string;
}

// ---------- View v_qlcv_cong_viec_full (thêm join) ----------
export interface CongViecView extends CongViec {
  nguoi_tao_ten?: string | null;
  nguoi_giao_ten?: string | null;
  nguoi_phu_trach_ten?: string | null;
  khoa_thuc_hien_ten?: string | null;
  to_cong_tac_ten?: string | null;
  trang_thai_mau_sac?: string | null;
  is_qua_han?: boolean;
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
}

// ---------- Bảng qlcv_fact_cong_viec_hoat_dong ----------
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
    | "XAC_NHAN_NHAN" // legacy timeline — lean pilot không tạo mới
    | "DUYET_HOAN_THANH"
    | "TU_CHOI_HOAN_THANH"
    | "GIA_HAN";
  nguoi_thuc_hien_id?: string | null;
  trang_thai?: string | null;
  noi_dung?: string | null;
  phan_tram_hoan_thanh: number;
  created_at: string;
}
