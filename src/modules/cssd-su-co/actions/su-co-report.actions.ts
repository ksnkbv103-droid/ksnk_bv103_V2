"use server";

import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidateCssdIncidentSurfaces, revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import {
  verifyCssdIncidentApprove,
  verifyCssdIncidentCreate,
  verifyCssdIncidentPrint,
} from "@/lib/cssd-server-gates";
import { isBatchQcFailTypeId } from "../domain/cssd-incident-taxonomy";
import { canApproveCssdIncident } from "../domain/cssd-incident-status";
import { resolveCssdCodeWithClient } from "@/modules/cssd-erp/shared/application/cssd-qr-hub";
import { isCirculationIncidentTypeCode } from "../domain/cssd-incident-attributes";
import { passesScPickerWhitelist, resolveScPickerWorkflowId } from "../domain/cssd-used-clinically";
import { cssdIncidentReportInputSchema } from "../contracts/su-co-report-input.schema";
import { executeIncidentReportAndRollback } from "../application/su-co-report.application";
import { executeConfirmIncidentReport } from "../application/confirm-incident.application";
import { executeCloseIncidentRelease } from "../application/close-incident-release.application";
import { executeVoidIncidentReport } from "../application/void-incident.application";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import { getActorRoleNames } from "@/lib/server-permission";
import {
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_VOID,
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
    const explicitQt = String(
      parsed.setReconcilePayload?.quyTrinhId || parsed.processPayload?.quyTrinhId || "",
    ).trim();
    const circulation = isCirculationIncidentTypeCode(parsed.typeId);
    const boId = String(resolved.boDungCuId || parsed.setReconcilePayload?.boDungCuId || "").trim();
    let workflowId = explicitQt || (resolved.workflowId ? String(resolved.workflowId) : "");
    if (!circulation && (parsed.incidentGroup === "PROCESS" || parsed.incidentGroup === "INSTRUMENT") && boId) {
      const picked = resolveScPickerWorkflowId({
        explicitId: explicitQt,
        candidates: await listScPickerCandidates(supabase, boId),
      });
      if (picked.error) throw new Error(picked.error);
      if (parsed.incidentGroup === "PROCESS" && !picked.quyTrinhId) {
        throw new Error("Chu trình này không nhận sự cố (đã dùng lâm sàng hoặc ngoài 6 trạm).");
      }
      workflowId = picked.quyTrinhId || "";
    }
    if (workflowId) {
      const { data: quyTrinh, error: qReadErr } = await supabase
        .from("v_cssd_quy_trinh_full")
        .select("*")
        .eq("id", workflowId)
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

  let allowBatchRecallOrder = false;
  if (parsed.incidentGroup === "PROCESS" && isBatchQcFailTypeId(parsed.typeId)) {
    // SC-02: chỉ ra lệnh thu hồi khi có quyền; còn lại → báo + cách ly bộ.
    try {
      await verifyCssdIncidentApprove();
      allowBatchRecallOrder = true;
    } catch {
      allowBatchRecallOrder = false;
    }
  }

  const {
    incident_id,
    isRedAlert,
    deduped,
    recalledCount,
    holdPendingCount,
    machineHeld,
    recalled,
    listedUsed,
    batchRecallDeferred,
  } = await executeIncidentReportAndRollback(
    supabase,
    {
      ...parsed,
      maQR: qr,
      reporterEmail,
      reporterAuthUserId,
      allowBatchRecallOrder,
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
    holdPendingCount: holdPendingCount || 0,
    machineHeld: Boolean(machineHeld),
    recalled: recalled || [],
    listedUsed: listedUsed || [],
    batchRecallDeferred: Boolean(batchRecallDeferred),
  };
}

/** SC-02: Tổ trưởng / Admin ra lệnh thu hồi theo mẻ từ phiếu đã báo. */
export async function commandBatchRecallFromIncident(incidentId: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  await verifyCssdIncidentApprove();
  const id = String(incidentId || "").trim();
  if (!id) return { success: false as const, error: "Thiếu mã phiếu sự cố." };

  const { data, error } = await supabase
    .from("cssd_fact_su_co")
    .select("id, attributes, ma_qr_quy_trinh, quy_trinh_id, mo_ta")
    .eq("id", id)
    .maybeSingle();
  if (error) return { success: false as const, error: error.message };
  if (!data) return { success: false as const, error: "Không tìm thấy phiếu." };

  const attrs = ((data as { attributes?: Record<string, unknown> }).attributes || {}) as Record<
    string,
    unknown
  >;
  const typeId = String(attrs.INCIDENT_TYPE_CODE || "").trim();
  const loId = String(attrs.LO_TIET_KHUAN_ID || "").trim();
  if (!isBatchQcFailTypeId(typeId) || !loId) {
    return { success: false as const, error: "Phiếu này không phải sự cố mẻ chờ thu hồi." };
  }
  if (String(attrs.BATCH_RECALL || "") === "1") {
    return { success: false as const, error: "Mẻ đã được thu hồi." };
  }

  let reporterEmail: string | null = null;
  let reporterAuthUserId: string | null = null;
  try {
    const uc = await createServerSupabaseUserClient();
    const u = await uc.auth.getUser();
    reporterEmail = u.data.user?.email?.trim() || null;
    reporterAuthUserId = u.data.user?.id ?? null;
  } catch {
    /* */
  }

  const result = await executeIncidentReportAndRollback(
    supabase,
    {
      maQR: String((data as { ma_qr_quy_trinh?: string }).ma_qr_quy_trinh || "") || undefined,
      station: "TIET_KHUAN",
      incidentGroup: "PROCESS",
      typeId,
      typeTen: String(attrs.INCIDENT_TYPE_LABEL || typeId),
      desc: String((data as { mo_ta?: string }).mo_ta || "Ra lệnh thu hồi theo mẻ"),
      reporterEmail,
      reporterAuthUserId,
      allowBatchRecallOrder: true,
      processPayload: {
        loTietKhuanId: loId,
        maLo: String(attrs.MA_LO || "") || undefined,
        quyTrinhId: String((data as { quy_trinh_id?: string }).quy_trinh_id || "") || null,
      },
    },
    null,
  );
  revalidateCssdIncidentSurfaces();
  return {
    success: true as const,
    incident_id: result.incident_id,
    recalledCount: result.recalledCount || 0,
    holdPendingCount: result.holdPendingCount || 0,
    machineHeld: Boolean(result.machineHeld),
  };
}

/** SC-8 / SC-03: xác nhận phiếu — Trưởng CSSD / Admin / Tổ trưởng mẻ; cấm tự xác nhận. */
export async function confirmIncidentReport(incidentId: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  await verifyCssdIncidentApprove();
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

/** CSSD-02: đóng (giải phóng) SC TK đã xác nhận — biên bản + lý do; quyền Trưởng/Hội đồng/Admin. */
export async function closeIncidentRelease(
  incidentId: string,
  opts: { lyDo: string; soBienBan: string },
) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  const actorAuthUserId = await getActorAuthUserId();
  const actorNhanSuId = await getActorNhanSuId();
  const actorRoles = await getActorRoleNames();
  let actorHoTen: string | null = null;
  if (actorNhanSuId) {
    const { data: ns } = await supabase.from("mdm_nhan_su").select("ho_ten").eq("id", actorNhanSuId).maybeSingle();
    actorHoTen = ns?.ho_ten ? String(ns.ho_ten).trim() : null;
  }
  const result = await executeCloseIncidentRelease(supabase, {
    incidentId,
    lyDo: opts.lyDo,
    soBienBan: opts.soBienBan,
    actorRoles,
    actorNhanSuId,
    actorAuthUserId,
    actorHoTen,
  });
  if (!result.ok) return { success: false as const, error: result.error };
  revalidateCssdIncidentSurfaces();
  return { success: true as const };
}

/** Vô hiệu phiếu đã ghi: trả trạm/cờ đỏ/tồn, bỏ khỏi đếm và báo cáo. SC-03: bắt buộc lý do. */
export async function voidIncidentReport(
  incidentId: string,
  opts?: { voidReasonCode?: string; voidReasonNote?: string },
) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdIncidentCreate();
  const actorRoles = await getActorRoleNames();
  let allowVoidConfirmed = false;
  try {
    await verifyCssdIncidentApprove();
    allowVoidConfirmed = true;
  } catch {
    allowVoidConfirmed = canApproveCssdIncident(actorRoles);
  }
  const actorNhanSuId = await getActorNhanSuId();
  let actorHoTen: string | null = null;
  if (actorNhanSuId) {
    const { data: ns } = await supabase.from("mdm_nhan_su").select("ho_ten").eq("id", actorNhanSuId).maybeSingle();
    actorHoTen = ns?.ho_ten ? String(ns.ho_ten).trim() : null;
  }
  const result = await executeVoidIncidentReport(supabase, {
    incidentId,
    actorNhanSuId,
    actorHoTen,
    voidReasonCode: opts?.voidReasonCode,
    voidReasonNote: opts?.voidReasonNote,
    allowVoidConfirmed,
  });
  if (!result.ok) return { success: false as const, error: result.error };
  revalidateCssdIncidentSurfaces();
  revalidateCssdInventorySurfaces();
  return { success: true as const, already: Boolean(result.already) };
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
    if (readIncidentPhieuStatus(attrs) === INCIDENT_STATUS_VOID) return false;
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

async function listScPickerCandidates(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  boDungCuId: string,
) {
  const { data, error } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id, is_active, metadata, tram:cssd_dm_tram!tram_hien_tai_id(ma_tram)")
    .eq("bo_dung_cu_id", boDungCuId)
    .eq("is_active", true)
    .limit(30);
  if (error) throw new Error(error.message);
  return (data || [])
    .map((raw) => {
      const r = raw as {
        id?: string;
        is_active?: boolean;
        metadata?: unknown;
        tram?: { ma_tram?: string | null } | { ma_tram?: string | null }[] | null;
      };
      const tramObj = Array.isArray(r.tram) ? r.tram[0] : r.tram;
      const id = String(r.id || "").trim();
      return {
        id,
        ok: passesScPickerWhitelist({
          isActive: r.is_active === true,
          tramHienTai: tramObj?.ma_tram,
          metadata: r.metadata,
        }),
      };
    })
    .filter((c) => c.id);
}

