import type { SupabaseClient } from "@supabase/supabase-js";

async function dmTen(sb: SupabaseClient, dmId: string | null): Promise<string | null> {
  if (!dmId) return null;
  const [cv, cd, vt] = await Promise.all([
    sb.from("dm_chuc_vu").select("ten_chuc_vu").eq("id", dmId).maybeSingle(),
    sb.from("dm_chuc_danh").select("ten_chuc_danh").eq("id", dmId).maybeSingle(),
    sb.from("dm_roles").select("name").eq("id", dmId).maybeSingle(),
  ]);
  const cvd = cv.data as { ten_chuc_vu?: string } | null;
  const cdd = cd.data as { ten_chuc_danh?: string } | null;
  const vtd = vt.data as { name?: string } | null;
  if (cvd?.ten_chuc_vu) return String(cvd.ten_chuc_vu);
  if (cdd?.ten_chuc_danh) return String(cdd.ten_chuc_danh);
  if (vtd?.name) return String(vtd.name);
  return null;
}

/** Gán UUID FK + tên hiển thị, xóa cột mã import tạm. */
export async function finalizeNhanSuImportRow(
  sb: SupabaseClient,
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
  const [chucVuTen, chucDanhTen, vaiTroTen] = await Promise.all([dmTen(sb, cvId), dmTen(sb, cdId), dmTen(sb, vtId)]);

  out.khoa_id = ids.khoaResolved;
  out.to_id = ids.toId;
  out.chuc_vu_id = cvId;
  out.chuc_vu = chucVuTen;
  out.chuc_danh_id = cdId;
  out.chuc_danh = chucDanhTen;
  out.vai_tro_he_thong_id = vtId;
  out.vai_tro_he_thong_ksnk = vaiTroTen;
  delete (out as Record<string, unknown> & { ma_khoa?: string }).ma_khoa;
  delete (out as Record<string, unknown> & { ma_to?: string }).ma_to;
  delete (out as Record<string, unknown> & { ten_to_cong_tac?: string }).ten_to_cong_tac;
  delete (out as Record<string, unknown> & { ma_chuc_vu?: string }).ma_chuc_vu;
  delete (out as Record<string, unknown> & { ma_chuc_danh?: string }).ma_chuc_danh;
  delete (out as Record<string, unknown> & { ma_vai_tro_ksnk?: string }).ma_vai_tro_ksnk;
  delete (out as Record<string, unknown> & { nghe_nghiep?: string }).nghe_nghiep;
  delete (out as Record<string, unknown> & { ma_nghe_nghiep?: string }).ma_nghe_nghiep;
}
