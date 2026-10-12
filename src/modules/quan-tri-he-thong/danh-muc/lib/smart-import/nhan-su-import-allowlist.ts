/**
 * Allowlist cột khi Smart Import ghi `mdm_nhan_su` (lát ACC-2).
 * Logic thuần — không import supabase/next.
 *
 * - Chỉ ghi cột hồ sơ; không ghi `auth_user_id`, `vai_tro_he_thong_id` (gán vai trò qua màn Tài khoản).
 * - Hồ sơ đã có tài khoản đăng nhập: giữ `is_active` và email đăng nhập hiện có
 *   (ngưng/đổi email phải qua màn Nhân sự để ban Auth / xác nhận lại mật khẩu).
 * - Thông tin cá nhân trong file được gộp vào `extra_data`, giữ nguyên các khóa khác đang có (vd. `auth_audit`).
 */

export const NHAN_SU_IMPORT_COLUMNS = [
  "id",
  "ma_nv",
  "ho_ten",
  "khoa_id",
  "to_id",
  "chuc_vu_id",
  "chuc_danh_id",
  "nghe_nghiep_id",
  "is_active",
  "updated_at",
] as const;

/** Khóa `extra_data` được phép lấy từ file import. */
export const NHAN_SU_IMPORT_EXTRA_KEYS = ["email", "so_dien_thoai", "ngay_sinh", "gioi_tinh"] as const;

export type NhanSuExistingForImport = {
  auth_user_id?: string | null;
  is_active?: boolean | null;
  extra_data?: unknown;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {};
}

function normEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

export function applyNhanSuImportAllowlist(
  payload: Record<string, unknown>,
  existing: NhanSuExistingForImport | undefined,
): { payload: Record<string, unknown>; notes: string[] } {
  const notes: string[] = [];
  const out: Record<string, unknown> = {};
  for (const col of NHAN_SU_IMPORT_COLUMNS) {
    if (col in payload) out[col] = payload[col];
  }

  const vaiTro = payload.vai_tro_he_thong_id;
  if (vaiTro != null && String(vaiTro).trim() !== "") {
    notes.push("bỏ qua vai trò KSNK trong file (gán ở màn Tài khoản)");
  }

  const hasAccount = Boolean(existing?.auth_user_id);
  const extra = asRecord(existing?.extra_data);
  for (const key of NHAN_SU_IMPORT_EXTRA_KEYS) {
    if (!(key in payload)) continue;
    const v = payload[key];
    if (key === "email" && hasAccount) {
      if (normEmail(v) && normEmail(v) !== normEmail(extra.email)) {
        notes.push("giữ email đăng nhập hiện có (đổi ở màn Nhân sự)");
      }
      continue;
    }
    extra[key] = key === "email" ? normEmail(v) || null : v;
  }
  out.extra_data = extra;

  if (hasAccount) {
    const current = existing?.is_active !== false;
    if ("is_active" in out && out.is_active !== current) {
      notes.push("giữ trạng thái hồ sơ đã có tài khoản (ngưng/kích hoạt ở màn Nhân sự)");
    }
    out.is_active = current;
  }

  return { payload: out, notes };
}
