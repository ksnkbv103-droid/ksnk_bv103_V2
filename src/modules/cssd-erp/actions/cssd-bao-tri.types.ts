/** Types bảo trì thiết bị CSSD. Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

export type FactBaoTriRow = {
  id: string;
  ma_phieu: string;
  thiet_bi_id: string;
  trang_thai: string;
  ly_do: string | null;
  ket_qua_ghi_nhan: string | null;
  thoi_gian_bat_dau: string | null;
  thoi_gian_ket_thuc: string | null;
  ten_thiet_bi?: string | null;
};
