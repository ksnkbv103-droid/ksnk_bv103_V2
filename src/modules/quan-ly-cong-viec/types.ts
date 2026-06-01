/**
 * Hợp đồng module Quản lý công việc (Contract-first) - V2.3
 * Nguồn chân lý: CHECK `fact_cong_viec` + dm_lookup_value (category_type=TRANG_THAI_CONG_VIEC).
 * Sprint 1: Bổ sung đầy đủ trạng thái runtime, thêm hoan_thanh_luc + gia_han_so_lan.
 *
 * Quy tắc: Tên trường = tên cột DB, KHÔNG có tiền tố ma_/ten_/ngay_.
 */

/**
 * Tất cả mã trạng thái hợp lệ của fact_cong_viec (dm_lookup_value.code).
 * - MOI / CHUA_BAT_DAU: mới tạo hoặc chờ nhận việc (alias cũ)
 * - CHO_NHAN_VIEC: đã giao, chờ người phụ trách xác nhận nhận
 * - DANG_LAM / DANG_THUC_HIEN: đang thực hiện (alias cũ)
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

// ---------- Bảng fact_cong_viec ----------
export interface CongViec {
  id: string;
  tieu_de: string;
  mo_ta?: string | null;
  loai_cong_viec: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien: "THAP" | "TRUNG_BINH" | "CAO";
  trang_thai: CongViecTrangThai;
  han_hoan_thanh?: string | null;
  phan_tram_hoan_thanh: number;
  /** Timestamp khi nghiệm thu thực tế (trang_thai → HOAN_THANH). Dùng cho KPI đúng hạn. */
  hoan_thanh_luc?: string | null;
  /** Số lần đã gia hạn (han_hoan_thanh bị dời sang ngày xa hơn). */
  gia_han_so_lan?: number;

  nguoi_tao_id?: string | null;
  nguoi_giao_viec_id?: string | null;
  nguoi_phu_trach_id?: string | null;
  khoa_thuc_hien_id?: string | null;
  to_cong_tac_id?: string | null;
  cong_viec_cha_id?: string | null;
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
