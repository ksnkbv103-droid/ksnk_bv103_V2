/** SSOT đường dẫn App Router — Quản trị hệ thống. */
const QUAN_TRI_HUB_PATH = "/quan-tri-he-thong";
const QUAN_TRI_DUNG_CU_PATH = "/quan-tri-he-thong/danh-muc/dung-cu";
export const QUAN_TRI_TAI_KHOAN_PATH = "/quan-tri-he-thong/tai-khoan";

export function quanTriTaiKhoanHref(): string {
  return QUAN_TRI_TAI_KHOAN_PATH;
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
 * Hub / deep-link Quản lý dụng cụ.
 * Mặc định = tab **Loại** (`?tab=loai`). Bộ / chi-tiết → `?tab=bo` (một click trên tab strip).
 */
export function quanTriDungCuHref(tab?: DungCuTab | "chi-tiet" | "bo"): string {
  if (!tab || tab === "loai") return `${QUAN_TRI_DUNG_CU_PATH}?tab=loai`;
  if (tab === "bo" || tab === "chi-tiet") return `${QUAN_TRI_DUNG_CU_PATH}?tab=bo`;
  return `${QUAN_TRI_DUNG_CU_PATH}?tab=${tab}`;
}
