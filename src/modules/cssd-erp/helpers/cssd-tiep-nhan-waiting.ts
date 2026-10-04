import { isCssdUnifiedBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import type { CSSDWaitingItem } from "../types/cssd.types";

export type TiepNhanCatalogRow = {
  id: string;
  ma_bo: string | null;
  ten_bo?: string | null;
  updated_at?: string | null;
};

/** Bộ catalog active, mã chuẩn, chưa có chu kỳ active đang gắn trạm. */
export function cssdTiepNhanWaitingItems(
  activeBoIds: ReadonlySet<string>,
  catalog: readonly TiepNhanCatalogRow[],
): CSSDWaitingItem[] {
  return catalog
    .filter((b) => !activeBoIds.has(String(b.id)))
    .filter((b) => isCssdUnifiedBoMa(b.ma_bo))
    .map((b) => ({
      id: String(b.id),
      ma_vach_qr: normalizeBoMa(b.ma_bo),
      updated_at: b.updated_at || new Date().toISOString(),
      ten_bo: String(b.ten_bo || b.ma_bo || "Bộ dụng cụ"),
      bo_dung_cu_id: String(b.id),
      nguoi_tram_truoc: null,
      sdt_tram_truoc: null,
      thoi_gian_tram_truoc: null,
      tram_truoc: null,
    }));
}
