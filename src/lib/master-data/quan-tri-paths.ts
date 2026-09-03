/** SSOT đường dẫn App Router — Quản trị hệ thống. */
const QUAN_TRI_HUB_PATH = "/quan-tri-he-thong";
const QUAN_TRI_DUNG_CU_PATH = "/quan-tri-he-thong/danh-muc/dung-cu";

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

/** Ba lớp mặt trước Quản lý dụng cụ. `loai` không còn tab ngang hàng. */
export type DungCuLayer = "bo" | "phieu" | "lich-su";

/** Bookmark cũ `loai` / `chi-tiet` vẫn nhận để deep-link. */
export type DungCuTab = DungCuLayer | "loai";

export function parseDungCuLayer(raw: string | null | undefined): DungCuLayer {
  if (raw === "phieu") return "phieu";
  if (raw === "lich-su") return "lich-su";
  return "bo";
}

/** Loại chỉ mở sheet phụ (ADMIN), không phải tab peer. */
export function parseDungCuLoaiSheet(tab: string | null | undefined, sheet: string | null | undefined): boolean {
  return sheet === "loai" || tab === "loai";
}

/** Bookmark cũ `chi-tiet` / `bo` → lớp Bộ (mặc định, không query). */
export function quanTriDungCuHref(tab?: DungCuTab | "chi-tiet" | "bo"): string {
  if (!tab || tab === "bo" || tab === "chi-tiet") return QUAN_TRI_DUNG_CU_PATH;
  if (tab === "loai") return `${QUAN_TRI_DUNG_CU_PATH}?sheet=loai`;
  return `${QUAN_TRI_DUNG_CU_PATH}?tab=${tab}`;
}
