/**
 * CSSD Workflow Operations - Action Layer
 *
 * Chứa các hành động bổ trợ cho quy trình (Báo sự cố, Mở khóa an toàn).
 * Tách từ cssd-write.actions.ts để đảm bảo giới hạn 180 dòng.
 */
"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidateCssdIncidentSurfaces, tableHasColumn, appendQuyTrinhException } from "./cssd-action-common";
import { verifyCssdInventoryEdit } from "@/lib/cssd-server-gates";
import { createIncidentReport as createIncidentReportImpl } from "@/modules/cssd-su-co/actions/su-co-report.actions";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import {
  INCIDENT_STATUS_OPEN,
  readIncidentPhieuStatus,
} from "@/modules/cssd-su-co/domain/cssd-incident-status";

export async function createIncidentReport(data: Parameters<typeof createIncidentReportImpl>[0]) {
  return createIncidentReportImpl(data);
}

export async function unlockDongBangQuyTrinhByMaQr(maQR: string) {
  await verifyCssdInventoryEdit();
  const supabase = createAdminSupabaseClient();
  const code = String(maQR || "").trim().toUpperCase();
  const hasCol = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_dong_bang");
  if (!hasCol) throw new Error("Phiên bản DB chưa hỗ trợ khóa an toàn.");

  const row = await fetchActiveQuyTrinhByScanCode(supabase, code);
  if (!row?.id) throw new Error("Không tìm thấy mã QR.");
  const quyId = String(row.id);

  const maQrFact = String((row as { ma_qr_quy_trinh?: string | null }).ma_qr_quy_trinh || code).trim().toUpperCase();
  const { data: suCoRows, error: suCoErr } = await supabase
    .from("cssd_fact_su_co")
    .select("id, attributes")
    .eq("ma_qr_quy_trinh", maQrFact);
  if (suCoErr) throw new Error(suCoErr.message);
  const openCount = (suCoRows || []).filter(
    (r) =>
      readIncidentPhieuStatus((r as { attributes?: Record<string, unknown> | null }).attributes) ===
      INCIDENT_STATUS_OPEN,
  ).length;
  if (openCount > 0) {
    throw new Error(
      `Còn ${openCount} phiếu sự cố chưa xác nhận gắn bộ này — xác nhận/đóng phiếu trước khi mở khóa.`,
    );
  }

  const { data: unlocked, error: upErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({ is_dong_bang: false, updated_at: new Date().toISOString() })
    .eq("id", quyId)
    .select("id");
  if (upErr) throw new Error(upErr.message);
  if (!unlocked?.length) throw new Error("Không mở khóa được bộ — bản ghi không còn hoặc đã đổi.");

  const operator = "Quản trị viên";
  await appendQuyTrinhException(
    supabase,
    quyId,
    {
      su_kien: "MO_DONG_BANG",
      ly_do: "Quản trị mở khóa an toàn (đóng băng)",
      nguoi_thao_tac: operator,
    },
    { soft: true },
  );

  revalidateCssdIncidentSurfaces();
  return { success: true as const };
}
