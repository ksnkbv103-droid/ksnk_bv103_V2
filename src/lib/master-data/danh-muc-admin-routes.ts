import { getRegistryEntryOrNull } from "./domain-registry";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";
import {
  CSSD_DANH_MUC_PATH,
  GSC_DANH_MUC_PATH,
  quanTriDungCuHref,
  TO_CHUC_KHOA_PHONG_PATH,
  TO_CHUC_PATH,
} from "./quan-tri-paths";

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

/**
 * AR-8e/8f (PO 2026-11-11): danh mục tra cứu sửa trong module sở hữu — khóa quyền xem → base route.
 * Loại không có trong bảng → còn ở `/quan-tri-he-thong/danh-muc/chuyen-biet` (dọn ở 8g).
 */
export const DANH_MUC_OWNER_BASE = {
  DANH_MUC_ORG: `${TO_CHUC_PATH}/danh-muc`,
  DANH_MUC_GSTT: GSC_DANH_MUC_PATH,
  DANH_MUC_CSSD_LOOKUP: CSSD_DANH_MUC_PATH,
} as const;
export type DanhMucOwnerKey = keyof typeof DANH_MUC_OWNER_BASE;

/** Khóa quyền module sở hữu loại danh mục (null = chưa có module sở hữu). */
export function getDanhMucOwnerKey(loaiDanhMuc: string): DanhMucOwnerKey | null {
  const entry = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!entry) return null;
  const key = getRegistryModuleForMasterTable(entry.sourceTable);
  return key && key in DANH_MUC_OWNER_BASE ? (key as DanhMucOwnerKey) : null;
}

/** Đường dẫn trang danh mục trong module sở hữu (null nếu loại không thuộc `owner`). */
export function getOwnedDanhMucHref(loaiDanhMuc: string, owner: DanhMucOwnerKey): string | null {
  const k = loaiDanhMuc.trim();
  if (getDanhMucOwnerKey(k) !== owner) return null;
  return `${DANH_MUC_OWNER_BASE[owner]}/${encodeURIComponent(k)}`;
}

/** AR-8e: loại thuộc quyền `DANH_MUC_ORG` (khối, tổ CT, chức vụ…) sửa trong module Tổ chức. */
export function isToChucLookupType(loaiDanhMuc: string): boolean {
  return getDanhMucOwnerKey(loaiDanhMuc) === "DANH_MUC_ORG";
}

/** Đường dẫn chuẩn theo registry: dedicated → module sở hữu → `/danh-muc/chuyen-biet/[LOAI]`. */
export function getDanhMucAdminPath(loaiDanhMuc: string): string {
  const k = loaiDanhMuc.trim();
  const dedicated = getDedicatedDanhMucAdminPath(k);
  if (dedicated) return dedicated;
  const owner = getDanhMucOwnerKey(k);
  if (owner) return `${DANH_MUC_OWNER_BASE[owner]}/${encodeURIComponent(k)}`;
  return `/quan-tri-he-thong/danh-muc/chuyen-biet/${encodeURIComponent(k)}`;
}
