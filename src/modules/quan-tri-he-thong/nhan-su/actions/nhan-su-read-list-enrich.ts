import { mapNhanSuViewRow } from "@/lib/nhan-su-view-row";
import { type NhanSu } from "../types";

/** Gắn nested khoa/tổ từ `v_mdm_nhan_su_full` (alias chuc_* đã có trên view). */
export async function enrichNhanSuListRows(rows: Record<string, unknown>[]): Promise<NhanSu[]> {
  return rows.map((x) => mapNhanSuViewRow(x) as unknown as NhanSu);
}
