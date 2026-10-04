import type { Catalog } from "../types/catalog.types";

/** Live dung-cu tabs. CHI_TIET→BO redirect kept in hook; HOA_CHAT lives at /cssd-hoa-chat. */
export type CatalogTab = "BO" | "LOAI" | "HISTORY" | "DE_NGHI" | "LUAN_CHUYEN";

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

export function boIdsForLoai(catalog: Catalog, loaiId: string | null) {
  if (!loaiId) return [];
  return [
    ...new Set(
      catalog.chi_tiet
        .filter((x) => x.loai_dung_cu_id === loaiId && x.bo_dung_cu_id)
        .map((x) => String(x.bo_dung_cu_id)),
    ),
  ];
}
