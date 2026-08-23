/** Route chuyên dụng (form đầy đủ) — khớp việc hàng ngày trên hub. */
const DEDICATED_LOAI_TO_PATH: Record<string, string> = {
  KHOA_PHONG: "/quan-tri-he-thong/danh-muc/khoa-phong",
  LOAI_DUNG_CU: "/quan-tri-he-thong/danh-muc/dung-cu",
};

/** Đường dẫn quản trị chuẩn theo registry: dedicated nếu có, không thì `/danh-muc/chuyen-biet/[LOAI]`. */
export function getDanhMucAdminPath(loaiDanhMuc: string): string {
  const k = loaiDanhMuc.trim();
  const dedicated = DEDICATED_LOAI_TO_PATH[k];
  if (dedicated) return dedicated;
  return `/quan-tri-he-thong/danh-muc/chuyen-biet/${encodeURIComponent(k)}`;
}
