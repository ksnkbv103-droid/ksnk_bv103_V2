"use server";

import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidateCssdIncidentSurfaces } from "@/lib/cssd-server-common";
import { verifyCssdIncidentCreate } from "@/lib/cssd-server-gates";
import { resolveCssdCodeWithClient } from "@/modules/cssd-erp/shared/application/cssd-qr-hub";
import { cssdIncidentReportInputSchema } from "../contracts/su-co-report-input.schema";
import { executeIncidentReportAndRollback } from "../application/su-co-report.application";

export async function createIncidentReport(data: {
  maQR: string;
  station: Station;
  incidentGroup: "PROCESS" | "INSTRUMENT" | "CHEMICAL" | "EQUIPMENT" | "OTHER";
  typeId: string;
  typeTen: string;
  faultStation?: Station;
  faultOperator?: string;
  desc: string;
  errorQR?: string;
  machineId?: string;
}) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  const parsed = cssdIncidentReportInputSchema.parse(data);
  const resolved = await resolveCssdCodeWithClient(supabase, parsed.maQR);
  if (resolved.targetType === "MACHINE") {
    throw new Error("Mã vừa quét là mã máy. Báo sự cố quy trình cần mã QR bộ dụng cụ.");
  }
  const qr = resolved.code;
  const { data: q, error: qReadErr } = await supabase
    .from("v_fact_quy_trinh_full")
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
    { ...parsed, maQR: qr, reporterEmail, reporterAuthUserId },
    q as Record<string, unknown> & { id: string; ma_trang_thai_hien_tai?: string | null },
  );

  revalidateCssdIncidentSurfaces();
  return { success: true as const, incident_id, isRedAlert };
}
