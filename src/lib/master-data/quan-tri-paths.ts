/** SSOT đường dẫn App Router — Quản trị hệ thống. */
export const QUAN_TRI_HUB_PATH = "/quan-tri-he-thong";
export const QUAN_TRI_DUNG_CU_PATH = "/quan-tri-he-thong/danh-muc/dung-cu";

export type QuanTriHubTab = "DANH_MUC" | "PHAN_QUYEN" | "MDM_GOVERNANCE";

/** `dm_registry` — deep link tới mục lookup trên tab Trung tâm (giữ bookmark cũ). */
export const QUAN_TRI_LOOKUP_TAB_QUERY = "dm_registry";

const TAB_QUERY: Record<QuanTriHubTab, string> = {
  DANH_MUC: "",
  PHAN_QUYEN: "phan_quyen",
  MDM_GOVERNANCE: "mdm_governance",
};

export function quanTriLookupSectionHref(): string {
  return `${QUAN_TRI_HUB_PATH}?tab=${QUAN_TRI_LOOKUP_TAB_QUERY}`;
}

export function quanTriHubHref(tab?: QuanTriHubTab): string {
  if (!tab || tab === "DANH_MUC") return QUAN_TRI_HUB_PATH;
  const q = TAB_QUERY[tab];
  return q ? `${QUAN_TRI_HUB_PATH}?tab=${q}` : QUAN_TRI_HUB_PATH;
}

export type DungCuTab = "loai" | "bo" | "chi-tiet";

export function quanTriDungCuHref(tab?: DungCuTab): string {
  if (!tab || tab === "loai") return QUAN_TRI_DUNG_CU_PATH;
  return `${QUAN_TRI_DUNG_CU_PATH}?tab=${tab}`;
}
