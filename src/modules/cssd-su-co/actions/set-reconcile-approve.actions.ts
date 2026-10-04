"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { revalidateCssdIncidentSurfaces, revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import { applyApprovedBomLines } from "@/lib/master-data/cssd-set-bom-apply-core";
import { catalogLinesOf } from "../application/set-reconcile-incident.application";
import {
  BOM_APPROVE_CLAIM_STATUS,
  BOM_APPROVE_FAILED_STATUS,
  canClaimBomApprove,
  canRejectBomApprove,
  isBomApproveHistoryStatus,
  rejectMoveOnlyKindsOnReconcile,
} from "@/lib/domain/cssd-set-reconcile";
import { formatCatalogApprovalDiff } from "@/lib/domain/cssd-catalog-master-write";
import {
  parseSetReconcileSnapshot,
  readSetReconcileBoId,
  readSetReconcileStatus,
} from "../domain/cssd-set-reconcile-attrs";

async function requireCatalogRead() {
  try {
    await verifyPermission("BO_DC", "view");
  } catch {
    await verifyPermission("DC_LE", "view");
  }
}

async function requireCatalogApprove() {
  try {
    await verifyPermission("DC_LE", "edit");
  } catch {
    await verifyPermission("BO_DC", "edit");
  }
}

const CLAIMED_MSG = "Phiếu đã được xử lý hoặc không còn chờ duyệt.";

export async function listPendingBomApprovalsAction() {
  try {
    await requireCatalogRead();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("v_cssd_su_co_full")
      .select("id, mo_ta, created_at, ma_qr_quy_trinh, attributes")
      .eq("incident_group", "INSTRUMENT")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw new Error(error.message);
    const rows = (data || [])
      .filter((r) => readSetReconcileStatus((r.attributes as Record<string, unknown>) || {}) === "BOM_PENDING")
      .map((r) => {
        const attrs = (r.attributes as Record<string, unknown>) || {};
        const snap = parseSetReconcileSnapshot(attrs.SET_RECONCILE_SNAPSHOT);
        const catalogLines = snap ? catalogLinesOf(snap.lines) : [];
        return {
          id: String(r.id),
          maBo: String(r.ma_qr_quy_trinh || snap?.maBo || ""),
          tenBo: snap?.tenBo || "",
          moTa: String(r.mo_ta || ""),
          createdAt: r.created_at ? String(r.created_at) : null,
          catalogLineCount: catalogLines.length,
          catalogDiffs: catalogLines.map(formatCatalogApprovalDiff),
        };
      });
    return { success: true as const, data: rows };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không tải hàng chờ duyệt." };
  }
}

export async function listSetReconcileHistoryAction() {
  try {
    await requireCatalogRead();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("v_cssd_su_co_full")
      .select("id, mo_ta, created_at, ma_qr_quy_trinh, attributes")
      .eq("incident_group", "INSTRUMENT")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw new Error(error.message);
    const rows = (data || [])
      .map((r) => {
        const attrs = (r.attributes as Record<string, unknown>) || {};
        const status = readSetReconcileStatus(attrs);
        const snap = parseSetReconcileSnapshot(attrs.SET_RECONCILE_SNAPSHOT);
        return {
          id: String(r.id),
          maBo: String(r.ma_qr_quy_trinh || snap?.maBo || ""),
          tenBo: snap?.tenBo || "",
          moTa: String(r.mo_ta || ""),
          createdAt: r.created_at ? String(r.created_at) : null,
          status: status || "",
        };
      })
      .filter((r) => isBomApproveHistoryStatus(r.status));
    return { success: true as const, data: rows };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không tải lịch sử phiếu." };
  }
}

export async function approveSetReconcileBomAction(incidentId: string) {
  try {
    await requireCatalogApprove();
    const id = String(incidentId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu phiếu." };
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("cssd_fact_su_co").select("id, attributes").eq("id", id).maybeSingle();
    if (error || !data) return { success: false as const, error: error?.message || "Không thấy phiếu." };
    const attrs = (data.attributes as Record<string, unknown>) || {};
    if (!canClaimBomApprove(readSetReconcileStatus(attrs))) {
      return { success: false as const, error: CLAIMED_MSG };
    }
    const snap = parseSetReconcileSnapshot(attrs.SET_RECONCILE_SNAPSHOT);
    const boId = readSetReconcileBoId(attrs) || snap?.boDungCuId;
    if (!snap || !boId) return { success: false as const, error: "Thiếu ảnh bảng thành phần." };
    const moveErr = rejectMoveOnlyKindsOnReconcile(snap.lines);
    if (moveErr) return { success: false as const, error: moveErr };

    const claimAttrs = { ...attrs, SET_RECONCILE_STATUS: BOM_APPROVE_CLAIM_STATUS };
    const { data: claimed, error: claimErr } = await supabase
      .from("cssd_fact_su_co")
      .update({ attributes: claimAttrs, updated_at: new Date().toISOString() })
      .eq("id", id)
      .contains("attributes", { SET_RECONCILE_STATUS: "BOM_PENDING" })
      .select("id")
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed?.id) return { success: false as const, error: CLAIMED_MSG };

    try {
      await applyApprovedBomLines(supabase, boId, catalogLinesOf(snap.lines));
    } catch (applyErr: unknown) {
      const failAttrs = { ...claimAttrs, SET_RECONCILE_STATUS: BOM_APPROVE_FAILED_STATUS };
      await supabase
        .from("cssd_fact_su_co")
        .update({ attributes: failAttrs, updated_at: new Date().toISOString() })
        .eq("id", id)
        .contains("attributes", { SET_RECONCILE_STATUS: BOM_APPROVE_CLAIM_STATUS });
      return {
        success: false as const,
        error: applyErr instanceof Error ? applyErr.message : "Không áp dụng được bảng thành phần.",
      };
    }

    let nguoiXacNhanId: string | null = null;
    try {
      const uc = await createServerSupabaseUserClient();
      const u = await uc.auth.getUser();
      const { data: ns } = await supabase
        .from("mdm_nhan_su")
        .select("id")
        .eq("auth_user_id", u.data.user?.id || "")
        .maybeSingle();
      nguoiXacNhanId = ns?.id ? String(ns.id) : null;
    } catch {
      /* không gắn người duyệt nếu không map được nhân sự */
    }
    const nextAttrs = { ...claimAttrs, SET_RECONCILE_STATUS: "BOM_APPROVED" };
    const patch: Record<string, unknown> = { attributes: nextAttrs, updated_at: new Date().toISOString() };
    if (nguoiXacNhanId) patch.nguoi_xac_nhan_id = nguoiXacNhanId;
    const { error: updErr } = await supabase
      .from("cssd_fact_su_co")
      .update(patch)
      .eq("id", id)
      .contains("attributes", { SET_RECONCILE_STATUS: BOM_APPROVE_CLAIM_STATUS });
    if (updErr) throw new Error(updErr.message);
    revalidateCssdIncidentSurfaces();
    revalidateCssdInventorySurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không duyệt được phiếu." };
  }
}

export async function rejectSetReconcileBomAction(incidentId: string) {
  try {
    await requireCatalogApprove();
    const id = String(incidentId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu phiếu." };
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("cssd_fact_su_co").select("id, attributes").eq("id", id).maybeSingle();
    if (error || !data) return { success: false as const, error: error?.message || "Không thấy phiếu." };
    const attrs = (data.attributes as Record<string, unknown>) || {};
    const st = readSetReconcileStatus(attrs);
    if (!canRejectBomApprove(st)) {
      return { success: false as const, error: CLAIMED_MSG };
    }
    const { data: rejected, error: updErr } = await supabase
      .from("cssd_fact_su_co")
      .update({
        attributes: { ...attrs, SET_RECONCILE_STATUS: "BOM_REJECTED" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .contains("attributes", { SET_RECONCILE_STATUS: st })
      .select("id")
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);
    if (!rejected?.id) return { success: false as const, error: CLAIMED_MSG };
    revalidateCssdIncidentSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không từ chối được phiếu." };
  }
}
