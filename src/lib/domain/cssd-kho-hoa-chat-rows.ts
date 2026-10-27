/** Lọc dòng mặt hàng trên màn Kho hóa chất (thuần, không I/O). */
import { matchesLoaiFilter } from "./cssd-hoa-chat-loai";
import type { DmStockSummary } from "./cssd-kho-hoa-chat-summary";

export type KhoChip = "ALL" | "HOA_CHAT" | "VAT_TU" | "CAN_CHU_Y" | "CHO_DUYET";

/** Cần chú ý = dưới định mức, quá hạn hoặc sắp hết hạn. */
export function isCanChuY(r: Pick<DmStockSummary, "duoi_dinh_muc" | "qua_han" | "sap_het_han">): boolean {
  return r.duoi_dinh_muc || r.qua_han || r.sap_het_han;
}

export function countCanChuY(rows: DmStockSummary[]): number {
  return rows.filter(isCanChuY).length;
}

export function filterKhoRows(
  rows: DmStockSummary[],
  chip: KhoChip,
  search: string,
  choDuyetByDm: ReadonlyMap<string, number>,
): DmStockSummary[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (chip === "HOA_CHAT" || chip === "VAT_TU") {
      if (!matchesLoaiFilter(r.loai_hoa_chat, chip)) return false;
    } else if (chip === "CAN_CHU_Y") {
      if (!isCanChuY(r)) return false;
    } else if (chip === "CHO_DUYET") {
      if (!(choDuyetByDm.get(r.id) ?? 0)) return false;
    }
    if (!q) return true;
    return `${r.ma_hoa_chat} ${r.ten_hoa_chat}`.toLowerCase().includes(q);
  });
}
