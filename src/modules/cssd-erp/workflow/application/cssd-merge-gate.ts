import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * CSSD-04 / L04: bỏ merge-gate hội quân MAIN/SUB.
 * Giữ hàm để chỗ gọi cũ không vỡ — luôn cho qua.
 */
export async function assertMergeGateForCapPhat(
  _supabase: SupabaseClient,
  _mainQuyTrinhRow: {
    id: string;
    ma_trang_thai_hien_tai?: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  return { ok: true };
}
