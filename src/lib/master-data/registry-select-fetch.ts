import type { SupabaseClient } from "@supabase/supabase-js";
import { getRegistryEntryOrNull } from "@/lib/master-data/domain-registry";

/** Một dòng danh mục chuẩn hóa cho dropdown (id + mã + tên). */
export type RegistrySelectRow = { id: string; ma: string; ten: string };

/**
 * Đọc dm_* theo hub `domain-registry` (cùng SSOT với tab Danh mục chuyên biệt).
 * Dùng chung cho server action (admin client hoặc user client có RLS).
 */
export async function fetchActiveRegistryDmRows(
  supabase: SupabaseClient,
  loaiDanhMuc: string,
): Promise<RegistrySelectRow[]> {
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) {
    throw new Error(`[registry-select-fetch] Loại chưa đăng ký hub: ${loaiDanhMuc}`);
  }
  const { sourceTable, maColumn, tenColumn } = reg;
  let query = supabase.from(sourceTable).select(`id, ${maColumn}, ${tenColumn}`) as any;
  if (sourceTable !== "dm_roles") {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query.order(tenColumn, { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      ma: String(r[maColumn] ?? "").trim(),
      ten: String(r[tenColumn] ?? "").trim(),
    };
  });
}
