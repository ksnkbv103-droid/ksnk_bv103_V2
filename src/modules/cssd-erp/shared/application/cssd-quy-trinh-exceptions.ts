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
    /** Before/after hoặc payload truy vết — RPC ghi nguyên object vào ngoai_le[]. */
    chi_tiet?: Record<string, unknown>;
  },
  opts?: { soft?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const soft = opts?.soft !== false;
  try {
    const id = String(quyTrinhId || "").trim();
    if (!id) {
      const message = "Thiếu quy_trinh_id.";
      if (!soft) throw new Error(message);
      return { ok: false, message };
    }

    const payload: Record<string, unknown> = {
      su_kien: event.su_kien,
      thoi_gian: new Date().toISOString(),
      nguoi_thao_tac: event.nguoi_thao_tac,
    };
    if (event.tu_tram) payload.tu_tram = event.tu_tram;
    if (event.den_tram) payload.den_tram = event.den_tram;
    if (event.ly_do) payload.ly_do = event.ly_do;
    if (event.chi_tiet && Object.keys(event.chi_tiet).length > 0) {
      payload.chi_tiet = event.chi_tiet;
    }

    const { error } = await supabase.rpc("rpc_cssd_quy_trinh_append_ngoai_le", {
      p_id: id,
      p_event: payload,
    });
    if (error) {
      const message = error.message;
      console.error({ module: "cssd-erp", action: "appendQuyTrinhException", error: message });
      if (!soft) throw new Error(message);
      return { ok: false, message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e || "Lỗi ghi ngoại lệ.");
    if (!soft) throw e instanceof Error ? e : new Error(message);
    return { ok: false, message };
  }
}
