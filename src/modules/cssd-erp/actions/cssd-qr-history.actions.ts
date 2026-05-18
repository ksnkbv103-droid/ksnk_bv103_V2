"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdWorkflowView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "../shared/cssd-db-utils";

export async function fetchCssdQrHistory(maQr: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdWorkflowView();
    const qr = String(maQr || "").trim().toUpperCase();
    if (!qr) return { success: false as const, error: "Vui lòng nhập mã QR" };

    const { data: q, error: qErr } = await supabase
      .from("v_fact_quy_trinh_full")
      .select("*")
      .eq("ma_qr_quy_trinh", qr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qErr) return { success: false as const, error: qErr.message };
    if (!q) return { success: false as const, error: "Không tìm thấy thông tin cho mã QR này" };

    const { data: logs, error: logErr } = await supabase
      .from("fact_nhat_ky_quet")
      .select("id, ma_tram, ma_hanh_dong, created_at, ghi_chu, quy_trinh_id")
      .eq("quy_trinh_id", q.id)
      .order("created_at", { ascending: false });
    if (logErr) return { success: false as const, error: logErr.message };

    const process = {
      ...q,
      ma_vach_qr: q.ma_qr_quy_trinh,
      trang_thai_hien_tai: q.ma_trang_thai_hien_tai,
    };
    const history = (logs || []).map((x) => ({
      id: String(x.id),
      tram: String(x.ma_tram || ""),
      hanh_dong: String(x.ma_hanh_dong || ""),
      created_at: String(x.created_at || ""),
      ghi_chu: String(x.ghi_chu || ""),
    }));

    return { success: true as const, process, history };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
