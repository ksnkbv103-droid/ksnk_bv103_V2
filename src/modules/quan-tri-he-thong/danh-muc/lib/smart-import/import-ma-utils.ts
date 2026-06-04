/** Hằng và helper thuần cho smart-import (mã Excel → tra danh mục). Không I/O DB. */

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Chuẩn hóa mã nghiệp vụ từ Excel (BOM, ký tự ẩn, khoảng trắng). */
export function normalizeImportMa(raw: unknown): string {
  return String(raw ?? "")
    .replace(/^\ufeff/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase();
}

/** Ô trống hoặc ký hiệu “không có” — không ép tra danh mục. */
export function isImportMaEmpty(ma: string): boolean {
  if (!ma) return true;
  return ["-", "—", "N/A", "NA", "NULL", "NONE", "KHONG", "KHÔNG"].includes(ma);
}

export const DM_TABLE_BY_LOAI: Record<string, { table: string; ma: string; ten: string }> = {
  KHOI_KHOA: { table: "mdm_dm_khoi_khoa", ma: "ma_khoi", ten: "ten_khoi" },
  TO_CONG_TAC: { table: "mdm_dm_to_cong_tac", ma: "ma_to", ten: "ten_to" },
  CHUC_VU: { table: "mdm_dm_chuc_vu", ma: "ma_chuc_vu", ten: "ten_chuc_vu" },
  CHUC_DANH: { table: "mdm_dm_chuc_danh", ma: "ma_chuc_danh", ten: "ten_chuc_danh" },
  VAI_TRO_HE_THONG_KSNK: { table: "sys_roles", ma: "name", ten: "name" },
  KHU_VUC_GIAM_SAT: { table: "gstt_dm_khu_vuc_giam_sat", ma: "ma_khu_vuc", ten: "ten_khu_vuc" },
  NGHE_NGHIEP: { table: "mdm_dm_nghe_nghiep", ma: "ma_nghe_nghiep", ten: "ten_nghe_nghiep" },
  LOAI_DUNG_CU: { table: "cssd_dm_loai_dung_cu", ma: "ma_loai_dung_cu", ten: "ten_loai_dung_cu" },
  LOAI_SU_CO: { table: "cssd_dm_loai_su_co", ma: "ma_loai_su_co", ten: "ten_loai_su_co" },
  LOAI_MAY_TIET_KHUAN: { table: "cssd_dm_loai_may", ma: "ma_loai_may", ten: "ten_loai_may" },
};

/** Chuỗi có vẻ là mã ngắn (ma_khoa, ma_bo…), không phải nguyên cụm tên tiếng Việt trong một ô. */
export function looksLikeShortBusinessCode(raw: string) {
  const s = raw.trim();
  if (!s || s.includes(" ") || s.length > 42) return false;
  const noVN = /^[A-Za-z0-9._\u034f-]+$/u.test(s.replace(/\s+/g, ""));
  return noVN || (s.length <= 16 && !/[\u00C0-\u1EF9\s]/.test(s));
}
