"use server";

import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidateCssdIncidentSurfaces } from "@/lib/cssd-server-common";
import { verifyCssdIncidentCreate } from "@/lib/cssd-server-gates";
import { resolveCssdCodeWithClient } from "@/modules/cssd-erp/shared/application/cssd-qr-hub";
import { cssdIncidentReportInputSchema } from "../contracts/su-co-report-input.schema";
import { executeIncidentReportAndRollback } from "../application/su-co-report.application";

export async function createIncidentReport(data: {
  maQR?: string;
  station: Station;
  incidentGroup: "PROCESS" | "INSTRUMENT" | "CHEMICAL" | "EQUIPMENT" | "OTHER";
  typeId: string;
  typeTen: string;
  faultStation?: Station;
  faultOperator?: string;
  desc: string;
  errorQR?: string;
  machineId?: string;
  anhMinhChung?: string;
}) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  const parsed = cssdIncidentReportInputSchema.parse(data);
  
  let qr: string | undefined = undefined;
  let q: Record<string, unknown> | null = null;

  if (parsed.maQR) {
    const resolved = await resolveCssdCodeWithClient(supabase, parsed.maQR);
    if (resolved.targetType === "MACHINE") {
      throw new Error("Mã vừa quét là mã máy. Báo sự cố quy trình cần mã QR bộ dụng cụ.");
    }
    qr = resolved.code;
    const { data: quyTrinh, error: qReadErr } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("*")
      .eq("ma_qr_quy_trinh", qr)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qReadErr) throw new Error("Lỗi đọc quy trình: " + qReadErr.message);
    if (!quyTrinh) throw new Error("Mã QR không tồn tại trong hệ thống!");
    q = quyTrinh as Record<string, unknown>;
  }

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
    { ...parsed, maQR: qr, reporterEmail, reporterAuthUserId },
    q ? (q as any) : null,
  );

  revalidateCssdIncidentSurfaces();
  return { success: true as const, incident_id, isRedAlert };
}

export async function getIncidentForPrint(id: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate(); // check permission

  // 1. Lấy thông tin sự cố cơ bản
  const { data: incident, error: incErr } = await supabase
    .from("v_cssd_su_co_full")
    .select("*, cssd_fact_quy_trinh(id, bo_dung_cu_id)")
    .eq("id", id)
    .maybeSingle();

  if (incErr) throw new Error("Lỗi đọc thông tin sự cố: " + incErr.message);
  if (!incident) throw new Error("Không tìm thấy thông tin sự cố!");

  // Lấy tên bộ dụng cụ và mã bộ nếu có
  let ten_bo: string | null = null;
  let ma_bo: string | null = null;
  const qt = incident.cssd_fact_quy_trinh as { bo_dung_cu_id?: string } | null;
  if (qt?.bo_dung_cu_id) {
    const { data: bo } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("ten_bo, ma_bo")
      .eq("id", qt.bo_dung_cu_id)
      .maybeSingle();
    if (bo) {
      ten_bo = bo.ten_bo || null;
      ma_bo = bo.ma_bo || null;
    }
  }

  // 2. Chuyển đổi cột attributes JSONB sang định dạng chi tiết EAV để tương thích ngược hoàn hảo với UI
  const details = Object.entries((incident as any).attributes || {}).map(([key, val]) => ({
    id: `${id}-${key}`,
    su_co_id: id,
    ma_chi_tiet_su_co: key,
    gia_tri_chi_tiet: String(val),
  }));

  return {
    success: true as const,
    incident: {
      ...incident,
      ten_bo,
      ma_bo,
    },
    details,
  };
}

