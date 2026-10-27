/**
 * CSSD Workflow Operations - Action Layer
 *
 * Chứa các hành động bổ trợ cho quy trình (Báo sự cố, Mở khóa an toàn).
 * Tách từ cssd-write.actions.ts để đảm bảo giới hạn 180 dòng.
 */
"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidateCssdIncidentSurfaces, tableHasColumn, appendQuyTrinhException } from "./cssd-action-common";
import { verifyCssdInventoryEdit } from "@/lib/cssd-server-gates";
import { createIncidentReport as createIncidentReportImpl } from "@/modules/cssd-su-co/actions/su-co-report.actions";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import { countUnlockBlockingIncidents } from "@/modules/cssd-su-co/domain/cssd-incident-status";
import { isChoThuVeCycle } from "@/modules/cssd-su-co/domain/cssd-batch-recall-hold";
import { getActorNhanSuId } from "@/lib/actor-auth-server";

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

  const { data: qtRow, error: qtErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("metadata, lo_tiet_khuan_id")
    .eq("id", quyId)
    .maybeSingle();
  if (qtErr) throw new Error(qtErr.message);
  if (isChoThuVeCycle((qtRow as { metadata?: unknown } | null)?.metadata)) {
    throw new Error("Bộ đang chờ thu về do thu hồi mẻ — nhận lại ở Tiếp nhận trước khi mở khóa.");
  }

  const maQrFact = String((row as { ma_qr_quy_trinh?: string | null }).ma_qr_quy_trinh || code).trim().toUpperCase();
  const loId = String((qtRow as { lo_tiet_khuan_id?: string | null } | null)?.lo_tiet_khuan_id || "").trim();
  const orParts = [`quy_trinh_id.eq.${quyId}`, `ma_qr_quy_trinh.eq.${maQrFact}`];
  if (loId) orParts.push(`attributes->>LO_TIET_KHUAN_ID.eq.${loId}`);
  const { data: suCoRows, error: suCoErr } = await supabase
    .from("cssd_fact_su_co")
    .select("id, attributes, is_active")
    .or(orParts.join(","))
    .eq("is_active", true);
  if (suCoErr) throw new Error(suCoErr.message);
  const openCount = countUnlockBlockingIncidents(
    (suCoRows || []) as { attributes?: Record<string, unknown> | null }[],
  );
  if (openCount > 0) {
    throw new Error(
      `Còn ${openCount} phiếu sự cố chưa đóng (giải phóng) gắn bộ hoặc mẻ này — xác nhận/đóng phiếu trước khi mở khóa.`,
    );
  }

  const { data: unlocked, error: upErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({ is_dong_bang: false, updated_at: new Date().toISOString() })
    .eq("id", quyId)
    .select("id");
  if (upErr) throw new Error(upErr.message);
  if (!unlocked?.length) throw new Error("Không mở khóa được bộ — bản ghi không còn hoặc đã đổi.");

  let operator = "CSSD";
  try {
    const nsId = await getActorNhanSuId();
    if (nsId) {
      const { data: ns } = await supabase.from("mdm_nhan_su").select("ho_ten").eq("id", nsId).maybeSingle();
      if (ns?.ho_ten) operator = String(ns.ho_ten).trim();
    }
    if (operator === "CSSD") {
      const uc = await createServerSupabaseUserClient();
      const { data: auth } = await uc.auth.getUser();
      if (auth.user?.email) operator = auth.user.email.trim();
    }
  } catch {
    /* giữ CSSD */
  }
  await appendQuyTrinhException(
    supabase,
    quyId,
    {
      su_kien: "MO_DONG_BANG",
      ly_do: "Mở khóa an toàn sau khi phiếu sự cố đã đóng (giải phóng)",
      nguoi_thao_tac: operator,
    },
    { soft: true },
  );

  revalidateCssdIncidentSurfaces();
  return { success: true as const };
}
