import type { Catalog, CSSDChiTiet } from "../types/catalog.types";
import type { DungCuChiTietTableRow } from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/dung-cu-chi-tiet-form-shared";

export type CatalogTab = "BO" | "CHI_TIET" | "LOAI" | "HOA_CHAT";

export function cssdChiTietToModalRow(x: CSSDChiTiet): DungCuChiTietTableRow {
  return {
    id: x.id,
    ma_chi_tiet: x.ma_chi_tiet || null,
    ten_chi_tiet: x.ten_chi_tiet || null,
    ten_dung_cu_le: x.ten_chi_tiet || null,
    bo_dung_cu_id: x.bo_dung_cu_id,
    loai_dung_cu_id: x.loai_dung_cu_id,
    so_luong: 1,
    max_suds_count: 100,
    trong_luong: null,
    ghi_chu: null,
    ma_qr_mau: null,
    is_active: x.is_active !== false,
    bo_dung_cu: x.bo_dung_cu_id ? { id: x.bo_dung_cu_id, ten_bo: x.ten_bo || null } : null,
    loai_dung_cu: x.loai_dung_cu_id
      ? { id: x.loai_dung_cu_id, ten_danh_muc: x.ten_loai || null, ma_danh_muc: null }
      : null,
  };
}

export function filterCatalogRows(catalog: Catalog, q: string) {
  const lowerQ = q.trim().toLowerCase();
  const boRows = !lowerQ
    ? catalog.bo
    : catalog.bo.filter((x) => `${x.ma_bo} ${x.ten_bo}`.toLowerCase().includes(lowerQ));
  const chiTietRows = !lowerQ
    ? catalog.chi_tiet
    : catalog.chi_tiet.filter((x) =>
        `${x.ma_chi_tiet} ${x.ten_chi_tiet} ${x.ten_bo || ""} ${x.ten_loai || ""}`.toLowerCase().includes(lowerQ),
      );
  const loaiRows = !lowerQ
    ? catalog.loai
    : catalog.loai.filter((x) => `${x.ma_loai_dung_cu} ${x.ten_loai_dung_cu}`.toLowerCase().includes(lowerQ));
  const hoaChatRows = !lowerQ
    ? catalog.hoa_chat
    : catalog.hoa_chat.filter((x) =>
        `${x.ma_hoa_chat} ${x.ten_hoa_chat} ${x.loai_hoa_chat || ""} ${x.don_vi_tinh || ""}`
          .toLowerCase()
          .includes(lowerQ),
      );
  return { lowerQ, boRows, chiTietRows, loaiRows, hoaChatRows };
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
