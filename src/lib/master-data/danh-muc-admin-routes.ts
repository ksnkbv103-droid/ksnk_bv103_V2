import { quanTriDungCuHref } from "./quan-tri-paths";

/** Route chuyên dụng (form đầy đủ) — khớp việc hàng ngày trên hub. */
const DEDICATED_LOAI_TO_PATH: Record<string, string> = {
  KHOA_PHONG: "/quan-tri-he-thong/danh-muc/khoa-phong",
  LOAI_DUNG_CU: quanTriDungCuHref("loai"),
};

/** Trang chuyên dụng nếu loại không được sửa qua form generic mã–tên. */
export function getDedicatedDanhMucAdminPath(loaiDanhMuc: string): string | null {
  return DEDICATED_LOAI_TO_PATH[loaiDanhMuc.trim()] ?? null;
}

/**
 * Lỗi khi gọi CRUD generic cho loại đã có trang riêng (Spaulding / khoa phòng).
 * `null` = được phép dùng form mã–tên.
 */
export function genericDmMustUseDedicatedPageError(loaiDanhMuc: string): string | null {
  const path = getDedicatedDanhMucAdminPath(loaiDanhMuc);
  if (!path) return null;
  return `Dùng trang chuyên dụng — form mã–tên không đủ trường nghiệp vụ. Mở: ${path}`;
}

/** Đường dẫn quản trị chuẩn theo registry: dedicated nếu có, không thì `/danh-muc/chuyen-biet/[LOAI]`. */
export function getDanhMucAdminPath(loaiDanhMuc: string): string {
  const k = loaiDanhMuc.trim();
  return getDedicatedDanhMucAdminPath(k) ?? `/quan-tri-he-thong/danh-muc/chuyen-biet/${encodeURIComponent(k)}`;
}
