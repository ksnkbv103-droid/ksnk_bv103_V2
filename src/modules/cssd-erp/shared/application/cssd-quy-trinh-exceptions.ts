import type { SupabaseClient } from "@supabase/supabase-js";

export async function mergeQuyTrinhMetadata(
  supabase: SupabaseClient,
  quyTrinhId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = String(quyTrinhId || "").trim();
  if (!id) return { ok: false, message: "Thiếu quy_trinh_id." };
  const { data, error } = await supabase.from("cssd_fact_quy_trinh").select("metadata").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Không tìm thấy quy trình." };
  const metadata =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {};
  const { error: upErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({ metadata: { ...metadata, ...patch }, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (upErr) return { ok: false, message: upErr.message };
  return { ok: true };
}

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
