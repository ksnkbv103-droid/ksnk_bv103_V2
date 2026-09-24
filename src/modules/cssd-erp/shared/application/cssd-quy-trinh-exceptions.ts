import type { SupabaseClient } from "@supabase/supabase-js";

/** Ghi nhận lịch sử ngoại lệ vào metadata JSONB của quy trình (cssd_fact_quy_trinh). */
export async function appendQuyTrinhException(
  supabase: SupabaseClient,
  quyTrinhId: string,
  event: {
    su_kien: string;
    tu_tram?: string;
    den_tram?: string;
    ly_do?: string;
    nguoi_thao_tac: string;
  },
) {
  try {
    const id = String(quyTrinhId || "").trim();
    if (!id) return;

    const { error } = await supabase.rpc("rpc_cssd_quy_trinh_append_ngoai_le", {
      p_id: id,
      p_event: {
        ...event,
        thoi_gian: new Date().toISOString(),
      },
    });
    if (error) {
      console.error({ module: "cssd-erp", action: "appendQuyTrinhException", error: error.message });
    }
  } catch {
    // Fail-soft: không chặn luồng chính nếu ghi log lỗi
  }
}
