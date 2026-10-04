import type { SupabaseClient } from "@supabase/supabase-js";
import { appendQuyTrinhException } from "./cssd-quy-trinh-exceptions";

/** Ghi sự kiện workflow vào metadata.ngoai_le của cssd_fact_quy_trinh (thay lifecycle_event). */
export async function insertCssdLifecycleEvent(
  supabase: SupabaseClient,
  p: {
    quy_trinh_id: string;
    ma_su_kien: string;
    ma_tram?: string | null;
    den_tram?: string | null;
    ghi_chu?: string | null;
    payload?: Record<string, unknown>;
    nguoi_thao_tac?: string;
    /** soft=false: lỗi ghi ngoai_le ném/trả ok:false (reject/domino). soft=true: fail-soft. */
    soft?: boolean;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = String(p.quy_trinh_id || "").trim();
  if (!id) return { ok: false, message: "Thiếu quy_trinh_id." };

  const soft = p.soft !== false;
  try {
    const result = await appendQuyTrinhException(
      supabase,
      id,
      {
        su_kien: p.ma_su_kien,
        tu_tram: p.ma_tram ?? undefined,
        den_tram: p.den_tram ?? undefined,
        ly_do: String(p.ghi_chu || "").trim() || undefined,
        nguoi_thao_tac: p.nguoi_thao_tac || "Hệ thống",
        chi_tiet: p.payload,
      },
      { soft },
    );
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || "Lỗi ghi sự kiện workflow.");
    if (!soft) throw e instanceof Error ? e : new Error(msg);
    return { ok: false, message: msg };
  }
}
