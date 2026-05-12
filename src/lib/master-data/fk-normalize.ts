import type { SupabaseClient } from "@supabase/supabase-js";
import { getRegistryEntry } from "./domain-registry";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function emptyFkToNull(idRaw: unknown): string | null {
  if (idRaw === null || idRaw === undefined) return null;
  const s = String(idRaw).trim();
  return s === "" ? null : s;
}

/** Chỉ chấp nhận id thật trên bảng tham chiếu; sai → null (tránh 23503). */
export async function normalizeNullableFk(
  supabase: SupabaseClient,
  table: string,
  idRaw: unknown
): Promise<string | null> {
  const id = emptyFkToNull(idRaw);
  if (!id) return null;
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase.from(table).select("id").eq("id", id).maybeSingle();
  if (error) throw new Error(`Kiểm tra FK ${table}: ${error.message}`);
  return data?.id || null;
}

/** FK tùy chọn tới mdm_nhan_su: có nhập thì phải khớp id thật. */
export async function normalizeHoSoNhanVienOptionalOrThrow(
  supabase: SupabaseClient,
  idRaw: unknown,
  fieldLabel: string
): Promise<string | null> {
  const raw = emptyFkToNull(idRaw);
  const id = await normalizeNullableFk(supabase, "mdm_nhan_su", idRaw);
  if (raw && !id) {
    throw new Error(`${fieldLabel}: id không khớp hồ sơ nhân viên (mdm_nhan_su).`);
  }
  return id;
}

/** dm_* theo registry: id tồn tại trong bảng đích. */
export async function normalizeDanhMucNullableByLoai(
  supabase: SupabaseClient,
  idRaw: unknown,
  loaiDanhMuc: string
): Promise<string | null> {
  const id = emptyFkToNull(idRaw);
  if (!id) return null;
  if (!UUID_RE.test(id)) return null;
  const registry = getRegistryEntry(loaiDanhMuc);
  const { data, error } = await supabase.from(registry.sourceTable).select("id").eq("id", id).maybeSingle();
  if (error) throw new Error(`Kiểm tra FK ${registry.sourceTable}.${loaiDanhMuc}: ${error.message}`);
  return data?.id || null;
}
