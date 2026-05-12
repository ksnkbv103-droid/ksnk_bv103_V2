import { type RegistryEntry, getRegistryEntry } from "./domain-registry";
import { getDanhMucItemById } from "./repository";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Sinh mã nghiệp vụ tiếp theo dựa trên mã hiện có trong bảng:
 * - Ưu tiên dãy `DM-0001` (lấy số lớn nhất trong toàn bộ mã quét được).
 * - Bổ sung số tận cùng của mã khác (ví dụ `KK03` → 3) để tránh trùng khi đổi format.
 */
export async function buildNextDmBusinessCode(supabase: any, reg: RegistryEntry): Promise<string> {
  const col = reg.maColumn;
  let res = await supabase.from(reg.sourceTable).select(col).order("updated_at", { ascending: false }).limit(500);
  if (res.error) {
    res = await supabase.from(reg.sourceTable).select(col).order(col, { ascending: false }).limit(500);
  }
  if (res.error) throw res.error;
  let maxNum = 0;
  const rows = Array.isArray(res.data) ? res.data : [];
  for (const r of rows) {
    const s = String((r as Record<string, unknown>)[col] ?? "");
    const dm = s.match(/^DM-(\d+)$/i);
    if (dm) {
      const n = parseInt(dm[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
      continue;
    }
    const tail = s.match(/(\d+)$/);
    if (tail) {
      const n = parseInt(tail[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }
  return `DM-${String(maxNum + 1).padStart(4, "0")}`;
}

export function buildMigratedUpsertPayload(
  reg: RegistryEntry,
  input: {
    ma: string;
    ten: string;
    isActive: boolean;
  }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    [reg.maColumn]: input.ma,
    [reg.tenColumn]: input.ten,
    is_active: input.isActive,
    updated_at: nowIso(),
  };
  if (reg.sourceTable === "dm_loai_dung_cu") {
    patch.ma_loai = String(input.ma).slice(0, 50);
    patch.ten_loai = input.ten;
  }
  return patch;
}

/** Bật/tắt is_active đúng bảng dm_* nguồn. */
export async function setDanhMucActiveFlag(supabase: any, id: string, isActive: boolean): Promise<void> {
  const item = await getDanhMucItemById(supabase, id);
  if (!item?.loai_danh_muc) throw new Error("Không tìm thấy danh mục.");
  const reg = getRegistryEntry(item.loai_danh_muc);
  const ts = nowIso();
  const { error } = await supabase.from(reg.sourceTable).update({ is_active: isActive, updated_at: ts }).eq("id", id);
  if (error) throw error;
}
