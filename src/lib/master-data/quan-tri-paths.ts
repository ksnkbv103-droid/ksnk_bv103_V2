/** SSOT đường dẫn App Router — Quản trị hệ thống. */
export const QUAN_TRI_HUB_PATH = "/quan-tri-he-thong";
/** PO 2026-10-27: quản lý dụng cụ nằm ở màn CSSD (tab Quản lý/Phiếu); route quản trị cũ chỉ còn redirect. */
const DUNG_CU_PATH = "/cssd-dung-cu";
export const QUAN_TRI_TAI_KHOAN_PATH = "/quan-tri-he-thong/tai-khoan";
export const QUAN_TRI_NHAN_SU_PATH = "/quan-tri-he-thong/nhan-su";
export const QUAN_TRI_BANG_KIEM_PATH = "/quan-tri-he-thong/bang-kiem";

export function quanTriTaiKhoanHref(): string {
  return QUAN_TRI_TAI_KHOAN_PATH;
}

/** Phiếu chờ trên Nhân sự — cùng tập `PENDING_ACCOUNT_REQUEST_CONTAINS`. */
export function quanTriNhanSuPendingHref(): string {
  return "/quan-tri-he-thong/nhan-su?pending=1";
}

/** Hồ sơ đang dùng, chưa gắn Auth — cùng lọc sức khỏe «chưa có tài khoản». */
export function quanTriNhanSuChuaTkHref(): string {
  return "/quan-tri-he-thong/nhan-su?chuaTk=1";
}

export type QuanTriHubTab = "DANH_MUC" | "PHAN_QUYEN" | "MDM_GOVERNANCE" | "SUC_KHOE";

const TAB_QUERY: Record<QuanTriHubTab, string> = {
  DANH_MUC: "",
  PHAN_QUYEN: "phan_quyen",
  MDM_GOVERNANCE: "mdm_governance",
  SUC_KHOE: "suc_khoe",
};

export function quanTriHubHref(tab?: QuanTriHubTab): string {
  if (!tab || tab === "DANH_MUC") return QUAN_TRI_HUB_PATH;
  const q = TAB_QUERY[tab];
  return q ? `${QUAN_TRI_HUB_PATH}?tab=${q}` : QUAN_TRI_HUB_PATH;
}

/** Lớp mặt trước Quản lý dụng cụ — Loại là peer tab ngang hàng (trung tâm danh mục). */
export type DungCuLayer = "loai" | "bo" | "phieu" | "lich-su";

/** Alias lịch sử; bookmark `chi-tiet` map về Bộ qua quanTriDungCuHref. */
export type DungCuTab = DungCuLayer;

/**
 * Parse lớp từ `?tab=` (và tùy chọn `?sheet=loai` legacy → loai).
 * Bookmark trống / không tab → **Loại** (trung tâm). `bo` / `chi-tiet` → Bộ.
 */
export function parseDungCuLayer(
  raw: string | null | undefined,
  sheet?: string | null | undefined,
): DungCuLayer {
  if (raw === "loai" || sheet === "loai") return "loai";
  if (raw === "phieu") return "phieu";
  if (raw === "lich-su") return "lich-su";
  if (raw === "bo" || raw === "chi-tiet") return "bo";
  return "loai";
}

/**
 * Deep-link cũ `?sheet=loai` hoặc `?tab=loai` — vẫn true để tương thích;
 * UI mở tab Loại (không còn Dialog sheet bắt buộc).
 */
export function parseDungCuLoaiSheet(tab: string | null | undefined, sheet: string | null | undefined): boolean {
  return sheet === "loai" || tab === "loai";
}

/**
 * Deep-link Quản lý dụng cụ trên màn CSSD.
 * loai → tab Loại và kho · bo/chi-tiet → tab Quản lý (ADMIN) · phieu/lich-su → tab Phiếu (hàng đợi duyệt).
 */
export function quanTriDungCuHref(tab?: DungCuTab | "chi-tiet" | "bo"): string {
  if (!tab || tab === "loai") return `${DUNG_CU_PATH}?tab=LOAI`;
  if (tab === "bo" || tab === "chi-tiet") return `${DUNG_CU_PATH}?tab=QUAN_LY`;
  return `${DUNG_CU_PATH}?tab=DE_NGHI`;
}
