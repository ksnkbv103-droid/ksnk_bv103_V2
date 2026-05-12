import { DanhMucItem } from "./types";
import { getAllLoaiDanhMucs, getRegistryEntry } from "./domain-registry";

/** Không còn cần thiết — giữ lại cho tương thích import cũ. */
export async function addResolvedLoaiValues(
  _supabase: any,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  void _supabase;
  const { loai_id: _drop, ...rest } = input;
  void _drop;
  return rest;
}

/** Tìm một bản ghi danh mục theo id, quét tất cả bảng dm_* trong registry. */
export async function getDanhMucItemById(
  supabase: any,
  id: string
): Promise<DanhMucItem | null> {
  if (!id) return null;
  for (const loai of getAllLoaiDanhMucs()) {
    const registry = getRegistryEntry(loai);
    const selectColumns =
      registry.sourceTable === "dm_roles"
        ? `id, ${registry.maColumn}, ${registry.tenColumn}`
        : `id, ${registry.maColumn}, ${registry.tenColumn}, is_active`;
    const { data: dmData, error: dmErr } = await supabase
      .from(registry.sourceTable)
      .select(selectColumns)
      .eq("id", id)
      .maybeSingle();
    if (dmErr || !dmData) continue;
    return {
      id: String(dmData.id || ""),
      ma_danh_muc: String(dmData[registry.maColumn] || ""),
      ten_danh_muc: String(dmData[registry.tenColumn] || ""),
      loai_danh_muc: loai,
      is_active: registry.sourceTable === "dm_roles" ? true : Boolean(dmData.is_active),
      extra_data: null,
    };
  }
  return null;
}
