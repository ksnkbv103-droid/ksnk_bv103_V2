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

    const { data, error } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("metadata")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return;
    const metadata = (data as { metadata?: Record<string, unknown> }).metadata || {};
    const ngoaiLe = Array.isArray(metadata.ngoai_le) ? metadata.ngoai_le : [];
    ngoaiLe.push({
      ...event,
      thoi_gian: new Date().toISOString(),
    });

    await supabase
      .from("cssd_fact_quy_trinh")
      .update({
        metadata: {
          ...metadata,
          ngoai_le: ngoaiLe,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  } catch {
    // Fail-soft: không chặn luồng chính nếu ghi log lỗi
  }
}
