/**
 * CSSD Workflow Operations - Action Layer
 * 
 * Chứa các hành động bổ trợ cho quy trình (Báo sự cố, Mở khóa an toàn).
 * Tách từ cssd-write.actions.ts để đảm bảo giới hạn 180 dòng.
 */
"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { safeRevalidate, tableHasColumn } from "./cssd-action-common";
import { executeIncidentReportAndRollback } from "../incident/application/cssd-incident-application";
import type { Station } from "../types/cssd.types";

export async function createIncidentReport(data: {
  maQR: string;
  station: Station;
  typeId: string;
  typeTen: string;
  desc: string;
  errorQR?: string;
  machineId?: string;
}) {
  const supabase = createAdminSupabaseClient();
  await verifyPermission("BAO_SU_CO", "create");
  const qr = String(data.maQR || "").trim().toUpperCase();
  const { data: q, error: qReadErr } = await supabase
    .from("fact_quy_trinh")
    .select("*")
    .eq("ma_qr_quy_trinh", qr)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (qReadErr) throw new Error("Lỗi đọc quy trình: " + qReadErr.message);
  if (!q) throw new Error("Mã QR không tồn tại trong hệ thống!");

  let reporterEmail: string | null = null;
  let reporterAuthUserId: string | null = null;
  try {
    const uc = await createServerSupabaseUserClient();
    const u = await uc.auth.getUser();
    reporterEmail = u.data.user?.email?.trim() || null;
    reporterAuthUserId = u.data.user?.id ?? null;
  } catch {
    /* ngoài phiên người dùng */
  }

  const { incident_id, isRedAlert } = await executeIncidentReportAndRollback(
    supabase,
    { ...data, maQR: qr, reporterEmail, reporterAuthUserId },
    q as Record<string, unknown> & { id: string; ma_trang_thai_hien_tai?: string | null },
  );

  safeRevalidate("/cssd-erp");
  return { success: true, incident_id, isRedAlert };
}

export async function unlockDongBangQuyTrinhByMaQr(maQR: string) {
  const supabase = createAdminSupabaseClient();
  await verifyPermission("CSSD_KHO_DUNGCU", "edit");
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

  safeRevalidate("/cssd-erp");
  return { success: true as const };
}
