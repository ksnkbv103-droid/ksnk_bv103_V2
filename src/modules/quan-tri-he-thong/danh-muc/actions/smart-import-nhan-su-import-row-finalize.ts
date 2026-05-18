import type { SupabaseClient } from "@supabase/supabase-js";

/** Gán UUID FK, xóa cột mã import tạm (nhãn đọc qua v_mdm_nhan_su_full). */
export async function finalizeNhanSuImportRow(
  _sb: SupabaseClient,
  out: Record<string, unknown>,
  ids: {
    khoaResolved: string | null;
    toId: string | null;
    chucVuResolved: string | null;
    chucDanhResolved: string | null;
    vaiTroResolved: string | null;
  },
) {
  const cvId = ids.chucVuResolved;
  const cdId = ids.chucDanhResolved;
  const vtId = ids.vaiTroResolved;
  out.khoa_id = ids.khoaResolved;
  out.to_id = ids.toId;
  out.chuc_vu_id = cvId;
  out.chuc_danh_id = cdId;
  out.vai_tro_he_thong_id = vtId;
  delete (out as Record<string, unknown>).chuc_vu;
  delete (out as Record<string, unknown>).chuc_danh;
  delete (out as Record<string, unknown>).vai_tro_he_thong_ksnk;
  delete (out as Record<string, unknown> & { ma_khoa?: string }).ma_khoa;
  delete (out as Record<string, unknown> & { ma_to?: string }).ma_to;
  delete (out as Record<string, unknown> & { ten_to_cong_tac?: string }).ten_to_cong_tac;
  delete (out as Record<string, unknown> & { ma_chuc_vu?: string }).ma_chuc_vu;
  delete (out as Record<string, unknown> & { ma_chuc_danh?: string }).ma_chuc_danh;
  delete (out as Record<string, unknown> & { ma_vai_tro_ksnk?: string }).ma_vai_tro_ksnk;
  delete (out as Record<string, unknown> & { nghe_nghiep?: string }).nghe_nghiep;
  delete (out as Record<string, unknown> & { ma_nghe_nghiep?: string }).ma_nghe_nghiep;
}
