/** Lọc dòng mặt hàng trên màn Kho hóa chất (thuần, không I/O). */
import { isHoaChatLoai, matchesLoaiFilter } from "./cssd-hoa-chat-loai";
import type { DmStockSummary } from "./cssd-kho-hoa-chat-summary";

export type KhoChip = "ALL" | "HOA_CHAT" | "VAT_TU" | "CAN_CHU_Y" | "SAP_HET" | "CHO_DUYET";

/** Sắp hết / hết hàng theo cảnh báo hai tầng (HC-F). */
export function isSapHet(r: Pick<DmStockSummary, "canh_bao">): boolean {
  return r.canh_bao.muc !== "OK";
}

/** Cần chú ý = dưới định mức, sắp hết, quá hạn hoặc sắp hết hạn. */
export function isCanChuY(r: Pick<DmStockSummary, "duoi_dinh_muc" | "qua_han" | "sap_het_han" | "canh_bao">): boolean {
  return r.duoi_dinh_muc || isSapHet(r) || r.qua_han || r.sap_het_han;
}

export function countSapHet(rows: DmStockSummary[]): number {
  return rows.filter(isSapHet).length;
}

export function countCanChuY(rows: DmStockSummary[]): number {
  return rows.filter(isCanChuY).length;
}

const foldVi = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();

export const NHOM_ALL = "";
export const NHOM_NONE = "__NONE__";

export type NhomOption = { id: string; ten: string };

/** Nhóm có mặt trong dữ liệu kho, theo loại đang chọn (ALL = mọi loại); «Chưa phân nhóm» cuối. */
export function nhomOptionsForChip(rows: DmStockSummary[], chip: KhoChip): NhomOption[] {
  const seen = new Map<string, string>();
  let none = false;
  for (const r of rows) {
    if ((chip === "HOA_CHAT" || chip === "VAT_TU") && !matchesLoaiFilter(r.loai_hoa_chat, chip)) continue;
    if (r.nhom_id) seen.set(r.nhom_id, r.nhom_ten || "—");
    else none = true;
  }
  const opts = [...seen].map(([id, ten]) => ({ id, ten })).sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  if (none) opts.push({ id: NHOM_NONE, ten: "Chưa phân nhóm" });
  return opts;
}

export type KhoGroup = { key: string; loaiLabel: string; nhomTen: string; rows: DmStockSummary[] };

/** Gom Loại → Nhóm (Hóa chất trước, Vật tư/test sau; nhóm theo tên, «Chưa phân nhóm» cuối). */
export function groupKhoRows(rows: DmStockSummary[]): KhoGroup[] {
  const map = new Map<string, KhoGroup>();
  for (const r of rows) {
    const hc = isHoaChatLoai(r.loai_hoa_chat);
    const nhomTen = r.nhom_id ? r.nhom_ten || "—" : "Chưa phân nhóm";
    const key = `${hc ? 0 : 1}|${r.nhom_id ? 0 : 1}|${nhomTen}`;
    const g = map.get(key) ?? { key, loaiLabel: hc ? "Hóa chất" : "Vật tư", nhomTen, rows: [] };
    g.rows.push(r);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key, "vi"));
}

export function filterKhoRows(
  rows: DmStockSummary[],
  chip: KhoChip,
  search: string,
  choDuyetByDm: ReadonlyMap<string, number>,
  nhomId: string = NHOM_ALL,
): DmStockSummary[] {
  const q = foldVi(search.trim());
  return rows.filter((r) => {
    if (chip === "HOA_CHAT" || chip === "VAT_TU") {
      if (!matchesLoaiFilter(r.loai_hoa_chat, chip)) return false;
    } else if (chip === "CAN_CHU_Y") {
      if (!isCanChuY(r)) return false;
    } else if (chip === "SAP_HET") {
      if (!isSapHet(r)) return false;
    } else if (chip === "CHO_DUYET") {
      if (!(choDuyetByDm.get(r.id) ?? 0)) return false;
    }
    if (nhomId !== NHOM_ALL && (r.nhom_id ?? NHOM_NONE) !== nhomId) return false;
    if (!q) return true;
    return foldVi(`${r.ma_hoa_chat} ${r.ten_hoa_chat}`).includes(q);
  });
}
