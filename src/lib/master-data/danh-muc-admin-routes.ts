import { getRegistryEntryOrNull } from "./domain-registry";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";
import { quanTriDungCuHref, TO_CHUC_KHOA_PHONG_PATH, toChucDanhMucHref } from "./quan-tri-paths";

/** Route chuyên dụng (form đầy đủ) — khớp việc hàng ngày trên hub. */
const DEDICATED_LOAI_TO_PATH: Record<string, string> = {
  KHOA_PHONG: TO_CHUC_KHOA_PHONG_PATH,
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

/** AR-8e: loại thuộc quyền `DANH_MUC_ORG` (khối, tổ CT, chức vụ…) sửa trong module Tổ chức. */
export function isToChucLookupType(loaiDanhMuc: string): boolean {
  const entry = getRegistryEntryOrNull(loaiDanhMuc.trim());
  return entry != null && getRegistryModuleForMasterTable(entry.sourceTable) === "DANH_MUC_ORG";
}

/** Đường dẫn quản trị chuẩn theo registry: dedicated → Tổ chức (ORG) → `/danh-muc/chuyen-biet/[LOAI]`. */
export function getDanhMucAdminPath(loaiDanhMuc: string): string {
  const k = loaiDanhMuc.trim();
  const dedicated = getDedicatedDanhMucAdminPath(k);
  if (dedicated) return dedicated;
  if (isToChucLookupType(k)) return toChucDanhMucHref(k);
  return `/quan-tri-he-thong/danh-muc/chuyen-biet/${encodeURIComponent(k)}`;
}
