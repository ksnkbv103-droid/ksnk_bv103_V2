// src/modules/cssd-erp/types/cssd.types.ts

export type Station = 'TIEP_NHAN' | 'LAM_SACH' | 'QC' | 'DONG_GOI' | 'TIET_KHUAN' | 'CAP_PHAT';

export interface CSSDProcess {
  id: string;
  ma_vach_qr: string;
  trang_thai_hien_tai: Station;
  updated_at: string;
}

export interface CSSDWaitingItem {
  id: string;
  ma_vach_qr: string;
  updated_at: string;
  ten_bo?: string | null;
  /** Tên người xử lý ở trạm trước */
  nguoi_tram_truoc?: string | null;
  /** SĐT người trạm trước (click-to-call) */
  sdt_tram_truoc?: string | null;
  /** Thời điểm qua trạm trước */
  thoi_gian_tram_truoc?: string | null;
  /** Mã trạm trước (LAM_SACH, QC, ...) */
  tram_truoc?: string | null;
}

export interface IncidentReport {
  id: string;
  ma_vach_qr: string;
  tram_phat_hien: string;
  loai_su_co: string;
  mo_ta: string;
  is_red_alert: boolean;
  created_at: string;
}
