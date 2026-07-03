import type { SupabaseClient } from "@supabase/supabase-js";
import { appendQuyTrinhException } from "./cssd-quy-trinh-exceptions";

/** Ghi sự kiện workflow vào metadata.ngoai_le của cssd_fact_quy_trinh (thay lifecycle_event). */
export async function insertCssdLifecycleEvent(
  supabase: SupabaseClient,
  p: {
    quy_trinh_id: string;
    ma_su_kien: string;
    ma_tram?: string | null;
    ghi_chu?: string | null;
    payload?: Record<string, unknown>;
    nguoi_thao_tac?: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = String(p.quy_trinh_id || "").trim();
  if (!id) return { ok: false, message: "Thiếu quy_trinh_id." };

  try {
    await appendQuyTrinhException(supabase, id, {
      su_kien: p.ma_su_kien,
      tu_tram: p.ma_tram ?? undefined,
      ly_do: String(p.ghi_chu || "").trim() || undefined,
      nguoi_thao_tac: p.nguoi_thao_tac || "Hệ thống",
    });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || "Lỗi ghi sự kiện workflow.");
    return { ok: false, message: msg };
  }
}
