/** Types Danh mục Hóa chất. Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

export type HoaChatRow = {
  id: string;
  ma_hoa_chat: string | null;
  ten_hoa_chat: string | null;
  loai_hoa_chat: string | null;
  don_vi_tinh: string | null;
  quy_cach: string | null;
  nong_do: string | null;
  han_su_dung: string | null;
  ghi_chu: string | null;
  is_active: boolean;
  nhom_id?: string | null;
  nhom_ten?: string | null;
  specs?: Record<string, any> | null;
};

export type HoaChatNhomRow = {
  id: string;
  ma: string;
  ten: string;
  loai_hoa_chat: "HOA_CHAT" | "VAT_TU";
  thu_tu: number;
  is_active: boolean;
};
