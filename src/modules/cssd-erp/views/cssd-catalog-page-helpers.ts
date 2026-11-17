import type { Catalog } from "../types/catalog.types";

/** Live dung-cu tabs. CHI_TIET→BO redirect kept in hook; HOA_CHAT lives at /cssd-hoa-chat. */
export type CatalogTab = "BO" | "LOAI" | "HISTORY" | "DE_NGHI" | "LUAN_CHUYEN" | "QUAN_LY";

export function filterCatalogRows(catalog: Catalog, q: string) {
  const lowerQ = q.trim().toLowerCase();
  const boRows = !lowerQ
    ? catalog.bo
    : catalog.bo.filter((x) => `${x.ma_bo} ${x.ten_bo}`.toLowerCase().includes(lowerQ));
  const loaiRows = !lowerQ
    ? catalog.loai
    : catalog.loai.filter((x) => `${x.ma_loai_dung_cu} ${x.ten_loai_dung_cu}`.toLowerCase().includes(lowerQ));
  return { lowerQ, boRows, loaiRows };
}
