"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";

/** Danh sách bộ đang hoạt động — picker điều chuyển dụng cụ. */
export async function listActiveBoForInstrumentTransferAction(search?: string) {
  await verifyPermission("BAO_SU_CO", "view");
  const supabase = createAdminSupabaseClient();
  let q = supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id, ten_bo, ma_bo")
    .eq("is_active", true)
    .order("ma_bo", { ascending: true })
    .limit(200);

  const term = String(search || "").trim();
  if (term) {
    q = q.or(`ma_bo.ilike.%${term}%,ten_bo.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: (data || []).map((r) => ({
      id: String(r.id || ""),
      ten_bo: String(r.ten_bo || "").trim() || "—",
      ma_bo: r.ma_bo != null ? String(r.ma_bo).trim() : "",
    })).filter((x) => x.id && x.ma_bo),
  };
}
