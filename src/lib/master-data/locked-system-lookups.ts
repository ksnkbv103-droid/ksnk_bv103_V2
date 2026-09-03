/** Danh mục mã máy — xem được, không sửa/nạp Excel trên UI thường ngày. */
export const LOCKED_SYSTEM_LOOKUP_LOAI = [
  "TRANG_THAI_CONG_VIEC",
  "TRANG_THAI_NKBV_CA",
  "TRAM_CSSD",
  "VAI_TRO_HE_THONG_KSNK",
] as const;

export type LockedSystemLookupLoai = (typeof LOCKED_SYSTEM_LOOKUP_LOAI)[number];

export function isLockedSystemLookup(loaiDanhMuc: string): boolean {
  return (LOCKED_SYSTEM_LOOKUP_LOAI as readonly string[]).includes(loaiDanhMuc.trim());
}
