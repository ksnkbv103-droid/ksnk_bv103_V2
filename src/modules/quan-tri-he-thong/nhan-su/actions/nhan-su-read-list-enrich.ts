import { mapNhanSuViewRow } from "@/lib/nhan-su-view-row";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import { type NhanSu } from "../types";

/** Gắn nested khoa/tổ từ `v_mdm_nhan_su_full` (alias chuc_* đã có trên view). */
export async function enrichNhanSuListRows(rows: Record<string, unknown>[]): Promise<NhanSu[]> {
  const mapped = rows.map((x) => mapNhanSuViewRow(x) as unknown as NhanSu);
  const khoaList = await getCachedDmKhoaPhong();
  const maById = new Map(
    (khoaList || []).map((k) => [String(k.id), String(k.ma_khoa || "").trim()] as const),
  );
  return mapped.map((row) => {
    if (!row.khoa?.id) return row;
    const ma = maById.get(String(row.khoa.id)) || "";
    return {
      ...row,
      khoa: {
        ...row.khoa,
        ...(ma ? { ma_khoa: ma } : {}),
      },
    };
  });
}
