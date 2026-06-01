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
      .from("v_cssd_quy_trinh_full")
      .select("*")
      .eq("ma_qr_quy_trinh", qr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qErr) return { success: false as const, error: qErr.message };
    if (!q) return { success: false as const, error: "Không tìm thấy thông tin cho mã QR này" };

    // Fetch lifecycle events
    const { data: lcEvents, error: lcErr } = await supabase
      .from("cssd_fact_lifecycle_event")
      .select("id, ma_tram, ma_su_kien, created_at, ghi_chu")
      .eq("quy_trinh_id", q.id);
      
    // Fetch quy trinh metadata for exceptions
    const { data: qtMeta, error: qtMetaErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("metadata")
      .eq("id", q.id)
      .maybeSingle();

    if (lcErr) return { success: false as const, error: lcErr.message };

    const combined: Array<{
      id: string;
      tram: string;
      hanh_dong: string;
      created_at: string;
      ghi_chu: string;
    }> = [];

    // Map lifecycle events
    if (lcEvents) {
      for (const x of lcEvents) {
        combined.push({
          id: String(x.id),
          tram: String(x.ma_tram || ""),
          hanh_dong: String(x.ma_su_kien || ""),
          created_at: String(x.created_at || ""),
          ghi_chu: String(x.ghi_chu || ""),
        });
      }
    }

    // Map exceptions from metadata.ngoai_le
    const metadata = (qtMeta as { metadata?: any })?.metadata || {};
    const ngoaiLe = Array.isArray(metadata.ngoai_le) ? metadata.ngoai_le : [];
    for (let i = 0; i < ngoaiLe.length; i++) {
      const x = ngoaiLe[i];
      combined.push({
        id: `exc-${i}-${x.thoi_gian || Date.now()}`,
        tram: String(x.tu_tram || x.den_tram || ""),
        hanh_dong: String(x.su_kien || ""),
        created_at: String(x.thoi_gian || ""),
        ghi_chu: `[Ngoại lệ] ${x.ly_do || ""}${x.nguoi_thao_tac ? ` (Người làm: ${x.nguoi_thao_tac})` : ""}`.trim(),
      });
    }

    // Sort by created_at descending (newest first)
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const process = {
      ...q,
      ma_vach_qr: q.ma_qr_quy_trinh,
      trang_thai_hien_tai: q.ma_trang_thai_hien_tai,
    };

    return { success: true as const, process, history: combined };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
