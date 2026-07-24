import type { SupabaseClient } from "@supabase/supabase-js";

const columnExistCache = new Map<string, boolean>();

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message?: unknown }).message || "").trim();
    if (msg) return msg;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "Lỗi không xác định";
}

export function mapFkError(message: string | undefined): string {
  const m = String(message || "");
  if (m.includes("quy_trinh_lo_tiet_khuan_id_fkey")) {
    return `${m} - lo_tiet_khuan_id khong ton tai. Hay import theo ma lo hop le hoac de trong.`;
  }
  if (m.includes("su_co_quy_trinh_id_fkey") || m.includes("nhat_ky_quet_quy_trinh_id_fkey")) {
    return `${m} - Quy trinh tham chieu khong hop le.`;
  }
  return m || "Co loi ghi du lieu.";
}

export async function tableHasColumn(supabase: SupabaseClient, table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  if (columnExistCache.has(key)) return Boolean(columnExistCache.get(key));
  const { error } = await supabase.from(table).select(`id,${column}`).limit(1);
  // Fail-safe: chỉ trả true khi probe không lỗi. Tránh false-positive (schema cache /
  // "column … does not exist") rồi select/update cột thiếu trên localhost.
  const ok = !error;
  columnExistCache.set(key, ok);
  return ok;
}

/** Xóa cache probe cột (test / sau migrate trong cùng process). */
export function clearTableHasColumnCache(): void {
  columnExistCache.clear();
}
