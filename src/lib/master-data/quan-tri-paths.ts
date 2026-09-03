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

export type DungCuTab = "loai" | "bo";

/** Bookmark cũ `chi-tiet` → tab bộ (thành phần sửa trong bộ). */
export function quanTriDungCuHref(tab?: DungCuTab | "chi-tiet"): string {
  if (!tab || tab === "loai") return QUAN_TRI_DUNG_CU_PATH;
  return `${QUAN_TRI_DUNG_CU_PATH}?tab=bo`;
}
