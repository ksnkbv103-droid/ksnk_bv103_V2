/** Types kho hóa chất CSSD. Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

export type KhoHoaChatTonLo = {
  id: string;
  dm_hoa_chat_id: string;
  ma_lo: string | null;
  han_su_dung: string | null;
  ton_so_luong: number;
  ma_hoa_chat?: string;
  ten_hoa_chat?: string;
  don_vi_tinh?: string | null;
  nguong_ton_toi_thieu?: number | null;
};

export type KhoHoaChatGiaoDichRow = {
  id: string;
  ma_phieu: string;
  dm_hoa_chat_id: string;
  loai_giao_dich: string;
  so_luong_co_dau: number;
  ma_lo: string | null;
  han_su_dung: string | null;
  ghi_chu: string | null;
  created_at: string | null;
  ten_hoa_chat?: string | null;
};
