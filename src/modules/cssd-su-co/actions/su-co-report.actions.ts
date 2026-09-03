"use server";

import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidateCssdIncidentSurfaces, revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import { verifyCssdIncidentCreate, verifyCssdIncidentPrint } from "@/lib/cssd-server-gates";
import { resolveCssdCodeWithClient } from "@/modules/cssd-erp/shared/application/cssd-qr-hub";
import { cssdIncidentReportInputSchema } from "../contracts/su-co-report-input.schema";
import { executeIncidentReportAndRollback } from "../application/su-co-report.application";
import { executeConfirmIncidentReport } from "../application/confirm-incident.application";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import {
  INCIDENT_STATUS_LABEL,
  readIncidentPhieuStatus,
} from "../domain/cssd-incident-status";
import { isSetReconcileDraftAttr } from "../domain/cssd-set-reconcile-attrs";

export async function createIncidentReport(data: {
  maQR?: string;
  station: Station;
  incidentGroup: "PROCESS" | "INSTRUMENT" | "CHEMICAL" | "EQUIPMENT" | "OTHER";
  typeId: string;
  typeTen: string;
  causeClass?: "SC_QUY_TRINH" | "SC_CHU_QUAN" | "SC_HE_THONG";
  faultStation?: Station;
  faultOperator?: string;
  faultOperatorId?: string;
  nguoiPhatHien?: string;
  nguoiPhatHienId?: string;
  thoiGianPhatHien?: string;
  desc: string;
  errorQR?: string;
  machineId?: string;
  anhMinhChung?: string;
  instrumentPayload?: {
    chiTietId?: string;
    loaiDungCuId?: string;
    boDungCuId?: string;
    quyTrinhId?: string | null;
    maQrNguon?: string;
    maQrDen?: string;
    tenDungCuLe?: string;
    quantity?: number;
    note?: string;
  };
  setReconcilePayload?: {
    boDungCuId: string;
    draftIncidentId?: string;
    quyTrinhId?: string | null;
    maBo?: string;
    tenBo?: string;
    lines: Array<{
      chiTietId?: string;
      loaiDungCuId?: string;
      tenDungCuLe: string;
      soLuongChuan: number;
      soLuongThucTe: number;
      soLuongDem: number;
      soLuongChuanDeXuat?: number;
      loaiDungCuIdDeXuat?: string;
      maLoai?: string;
      maLoaiDeXuat?: string;
      tenDungCuLeDeXuat?: string;
      maKhac?: string;
      maKhacGoc?: string;
      maQrDen?: string;
      kind: "KHOP" | "HONG" | "MAT" | "BO_SUNG" | "TRA_KHO" | "DOI_CHUAN" | "DOI_LOAI" | "DIEU_CHUYEN" | "THEM_DONG" | "XOA_DONG";
      note?: string;
    }>;
  };
  processPayload?: {
    loTietKhuanId?: string;
    maLo?: string;
    quyTrinhId?: string | null;
  };
  confirmDuplicate?: boolean;
}) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  const parsed = cssdIncidentReportInputSchema.parse(data);
  
  let qr: string | undefined = undefined;
  let q: Record<string, unknown> | null = null;
  const isSetReconcile = Boolean(parsed.setReconcilePayload);

  if (parsed.maQR) {
    const resolved = await resolveCssdCodeWithClient(supabase, parsed.maQR);
    if (resolved.targetType === "MACHINE") {
      throw new Error("Mã vừa quét là mã máy. Báo sự cố quy trình cần mã QR bộ dụng cụ.");
    }
    if (resolved.targetType !== "INSTRUMENT_SET") {
      throw new Error("Mã QR không tồn tại trong hệ thống!");
    }
    if (!isSetReconcile && !resolved.workflowId) {
      throw new Error("Mã QR không tồn tại trong hệ thống!");
    }
    qr = resolved.code;
    if (parsed.setReconcilePayload && resolved.boDungCuId && !parsed.setReconcilePayload.boDungCuId) {
      parsed.setReconcilePayload.boDungCuId = resolved.boDungCuId;
    }
    if (resolved.workflowId) {
      const { data: quyTrinh, error: qReadErr } = await supabase
        .from("v_cssd_quy_trinh_full")
        .select("*")
        .eq("id", resolved.workflowId)
        .maybeSingle();
      if (qReadErr) throw new Error("Lỗi đọc quy trình: " + qReadErr.message);
      if (quyTrinh) q = quyTrinh as Record<string, unknown>;
    }
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

  const { incident_id, isRedAlert, deduped, recalledCount, machineHeld } = await executeIncidentReportAndRollback(
    supabase,
    {
      ...parsed,
      maQR: qr,
      reporterEmail,
      reporterAuthUserId,
      instrumentPayload: parsed.instrumentPayload
        ? { ...parsed.instrumentPayload, typeId: parsed.typeId }
        : undefined,
      setReconcilePayload: parsed.setReconcilePayload,
    },
    q ? (q as any) : null,
  );

  revalidateCssdIncidentSurfaces();
  if (parsed.incidentGroup === "INSTRUMENT") revalidateCssdInventorySurfaces();
  return {
    success: true as const,
    incident_id,
    isRedAlert,
    deduped: Boolean(deduped),
    recalledCount: recalledCount || 0,
    machineHeld: Boolean(machineHeld),
  };
}

/** SC-8: xác nhận / đóng phiếu sự cố đang mở. */
export async function confirmIncidentReport(incidentId: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  const actorAuthUserId = await getActorAuthUserId();
  const actorNhanSuId = await getActorNhanSuId();
  let actorHoTen: string | null = null;
  if (actorNhanSuId) {
    const { data: ns } = await supabase.from("mdm_nhan_su").select("ho_ten").eq("id", actorNhanSuId).maybeSingle();
    actorHoTen = ns?.ho_ten ? String(ns.ho_ten).trim() : null;
  }
  const result = await executeConfirmIncidentReport(supabase, {
    incidentId,
    actorNhanSuId,
    actorAuthUserId,
    actorHoTen,
  });
  if (!result.ok) return { success: false as const, error: result.error };
  revalidateCssdIncidentSurfaces();
  return { success: true as const };
}

export async function listRecentSuCoForReporter() {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentPrint();

  let reporterAuthUserId: string | null = null;
  try {
    const uc = await createServerSupabaseUserClient();
    const u = await uc.auth.getUser();
    reporterAuthUserId = u.data.user?.id ?? null;
  } catch {
    /* ngoài phiên */
  }

  const { data, error } = await supabase
    .from("v_cssd_su_co_full")
    .select("id, mo_ta, created_at, incident_group, incident_type_label, attributes, ma_qr_quy_trinh")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) throw new Error("Lỗi đọc phiếu sự cố: " + error.message);

  if (!reporterAuthUserId) return { success: true as const, data: [] };

  const rows = (data || []).filter((row) => {
    const attrs = (row.attributes as Record<string, unknown>) || {};
    const auth = String(attrs.REPORTER_AUTH_USER_ID || attrs.reporter_auth_user_id || "").trim();
    if (isSetReconcileDraftAttr(attrs)) return false;
    return auth === reporterAuthUserId;
  }).slice(0, 8);

  return {
    success: true as const,
    data: rows.map((r) => {
      const attrs = (r.attributes as Record<string, unknown>) || {};
      const status = readIncidentPhieuStatus(attrs);
      return {
        id: String(r.id),
        mo_ta: String(r.mo_ta || "").trim(),
        created_at: r.created_at ? String(r.created_at) : null,
        incident_type_label: r.incident_type_label != null ? String(r.incident_type_label) : null,
        ma_qr: r.ma_qr_quy_trinh != null ? String(r.ma_qr_quy_trinh) : null,
        incident_status: status,
        incident_status_label: INCIDENT_STATUS_LABEL[status],
      };
    }),
  };
}

export async function getIncidentForPrint(id: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentPrint();

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
  const attrs = ((incident as { attributes?: Record<string, unknown> }).attributes || {}) as Record<string, unknown>;
  const boFromAttr = String(attrs.BO_DUNG_CU_ID || "").trim();
  const boId = String(qt?.bo_dung_cu_id || boFromAttr || "").trim();
  if (boId) {
    const { data: bo } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("ten_bo, ma_bo")
      .eq("id", boId)
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

