/**
 * Hợp đồng module Quản lý công việc (Contract-first).
 * SSOT: `qlcv_fact_cong_viec` (ghi/đọc); list UI: `v_qlcv_cong_viec_full`.
 * Trạng thái runtime: cột `trang_thai` text + CHECK.
 *
 * Quy tắc: Tên trường = tên cột DB, KHÔNG có tiền tố ma_/ten_/ngay_.
 */

/**
 * Mã trạng thái — DB CHECK chỉ 7 mã canonical (xem `trang-thai-canonical.ts`).
 * Alias legacy còn trên type để đọc dữ liệu cũ; ghi mới luôn normalize về 7 mã.
 * DE_XUAT_CHO_DUYET: virtual (is_active=false + MOI) — không lưu DB.
 */
export type CongViecTrangThai =
  | "MOI"
  | "CHUA_BAT_DAU" // alias → MOI
  | "CHO_NHAN_VIEC" // alias → DANG_LAM
  | "DANG_LAM"
  | "DANG_THUC_HIEN" // alias → DANG_LAM
  | "CHO_DUYET"
  | "CHO_XAC_NHAN_HOAN_THANH" // alias → CHO_DUYET
  | "TU_CHOI"
  | "HOAN_THANH"
  | "QUA_HAN"
  | "DA_HUY"
  | "DE_XUAT_CHO_DUYET";

// ---------- Bảng qlcv_fact_cong_viec ----------
export interface CongViec {
  id: string;
  tieu_de: string;
  mo_ta?: string | null;
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien: "THAP" | "TRUNG_BINH" | "CAO";
  trang_thai: CongViecTrangThai;
  han_hoan_thanh?: string | null;
  /** Ngày thực hiện theo lịch (khác hạn hoàn thành). */
  ngay_thuc_hien?: string | null;
  gio_bat_dau?: string | null;
  gio_ket_thuc?: string | null;
  phan_tram_hoan_thanh: number;
  /** Set bởi trigger DB khi nghiệm thu (HOAN_THANH). */
  hoan_thanh_luc?: string | null;
  /** Tăng bởi trigger DB khi gia hạn hạn hoàn thành. */
  gia_han_so_lan?: number;

  nguoi_tao_id?: string | null;
  nguoi_giao_viec_id?: string | null;
  nguoi_phu_trach_id?: string | null;
  to_cong_tac_id?: string | null;
  /** Vị trí thực hiện (text tùy biến). */
  vi_tri_thuc_hien?: string | null;
  /** FK khoa MDM — địa điểm bắt buộc. */
  dia_diem_khoa_id?: string | null;
  /** FK nhiệm vụ (tuỳ chọn). */
  nhiem_vu_id?: string | null;
  /** Nhân sự phối hợp (uuid[]). */
  nguoi_phoi_hop_ids?: string[] | null;
  /** Nhân sự theo dõi / giám sát (uuid[]). */
  nguoi_theo_doi_ids?: string[] | null;
  /** FK mẫu định kỳ khi phiếu sinh từ spawn (null = đột xuất / đề xuất). */
  dinh_ky_mau_id?: string | null;
  /** Mục tick 1 chạm — [{ id, label, done }] */
  checklist?: unknown;
  /** Nhật ký sự kiện — SSOT thay bảng hoat_dong. */
  nhat_ky?: unknown;

  created_at: string;
  updated_at: string;
}

// ---------- View v_qlcv_cong_viec_full (thêm join) ----------
export interface CongViecView extends CongViec {
  nguoi_tao_ten?: string | null;
  nguoi_giao_ten?: string | null;
  nguoi_phu_trach_ten?: string | null;
  to_cong_tac_ten?: string | null;
  dia_diem_khoa_ten?: string | null;
  dia_diem_khoa_ma?: string | null;
  nhiem_vu_ten?: string | null;
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
  to_cong_tac_id?: string | null;
}

// ---------- Nhật ký JSON trên qlcv_fact_cong_viec.nhat_ky ----------
export interface NhatKyEntry {
  id?: string;
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
  phan_tram_hoan_thanh?: number | null;
  created_at?: string;
}

/** @deprecated Alias timeline — cùng shape NhatKyEntry + join ho_ten UI. */
export type HoatDong = NhatKyEntry & { id: string; created_at: string };
