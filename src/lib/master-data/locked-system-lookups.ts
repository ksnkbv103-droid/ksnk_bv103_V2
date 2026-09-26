/** Danh mục mã máy / CDC — xem được; không sửa/nạp Excel trên UI thường ngày.
 *  QLCV LOAI/TRANG_THAI_* giữ khóa đến khi apply migrate Wave3c DROP dm views.
 *  LOAI_NKBV: Strategy B lock+allowlist (giữ FK rows; không CRUD hub). */
export const LOCKED_SYSTEM_LOOKUP_LOAI = [
  "LOAI_CONG_VIEC",
  "TRANG_THAI_CONG_VIEC",
  "TRANG_THAI_NKBV_CA",
  "LOAI_NKBV",
  "TRAM_CSSD",
  "VAI_TRO_HE_THONG_KSNK",
] as const;

export type LockedSystemLookupLoai = (typeof LOCKED_SYSTEM_LOOKUP_LOAI)[number];

export function isLockedSystemLookup(loaiDanhMuc: string): boolean {
  return (LOCKED_SYSTEM_LOOKUP_LOAI as readonly string[]).includes(loaiDanhMuc.trim());
}

/** Thông báo khi gọi CRUD/import generic trên danh mục mã máy. */
export function lockedSystemLookupMutateError(loaiDanhMuc: string): string | null {
  if (!isLockedSystemLookup(loaiDanhMuc)) return null;
  return (
    `Danh mục hệ thống (${loaiDanhMuc.trim()}) — chỉ xem. ` +
    "Không thêm, sửa, xóa hay nạp Excel (admin không được thêm mã ngoài seed Domain)."
  );
}

