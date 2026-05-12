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
