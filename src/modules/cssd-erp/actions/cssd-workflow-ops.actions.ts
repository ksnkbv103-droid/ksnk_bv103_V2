/**
 * CSSD Workflow Operations - Action Layer
 *
 * Chứa các hành động bổ trợ cho quy trình (Báo sự cố, Mở khóa an toàn).
 * Tách từ cssd-write.actions.ts để đảm bảo giới hạn 180 dòng.
 */
"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidateCssdIncidentSurfaces, tableHasColumn } from "./cssd-action-common";
import { verifyCssdInventoryEdit } from "./cssd-permissions";
import { createIncidentReport as createIncidentReportImpl } from "@/modules/cssd-su-co/actions/su-co-report.actions";

export async function createIncidentReport(data: Parameters<typeof createIncidentReportImpl>[0]) {
  return createIncidentReportImpl(data);
}

export async function unlockDongBangQuyTrinhByMaQr(maQR: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdInventoryEdit();
  const code = String(maQR || "").trim().toUpperCase();
  const hasCol = await tableHasColumn(supabase, "fact_quy_trinh", "is_dong_bang");
  if (!hasCol) throw new Error("Phiên bản DB chưa hỗ trợ khóa an toàn.");
  const { data: row, error } = await supabase
    .from("fact_quy_trinh")
    .select("id")
    .eq("ma_qr_quy_trinh", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Không tìm thấy mã QR.");
  const { error: upErr } = await supabase
    .from("fact_quy_trinh")
    .update({ is_dong_bang: false, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (upErr) throw new Error(upErr.message);

  const nk: Record<string, unknown> = {
    ma_hanh_dong: "MO_DONG_BANG",
    ghi_chu: "Quản trị mở khóa an toàn (đóng băng)",
  };
  if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "quy_trinh_id")) nk.quy_trinh_id = row.id;
  if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "ma_tram")) nk.ma_tram = "QC";
  const { error: nkErr } = await supabase.from("fact_nhat_ky_quet").insert(nk);
  if (nkErr) throw new Error(nkErr.message);

  revalidateCssdIncidentSurfaces();
  return { success: true as const };
}
