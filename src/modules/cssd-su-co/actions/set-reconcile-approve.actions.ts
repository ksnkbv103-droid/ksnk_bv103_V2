"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { revalidateCssdIncidentSurfaces, revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import { applyApprovedBomLines } from "@/lib/master-data/cssd-set-bom-apply-core";
import { catalogLinesOf } from "../application/set-reconcile-incident.application";
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
      .filter((r) => r.status === "BOM_APPROVED" || r.status === "BOM_REJECTED" || r.status === "NONE");
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
    if (readSetReconcileStatus(attrs) !== "BOM_PENDING") {
      return { success: false as const, error: "Phiếu không còn chờ duyệt chuẩn." };
    }
    const snap = parseSetReconcileSnapshot(attrs.SET_RECONCILE_SNAPSHOT);
    const boId = readSetReconcileBoId(attrs) || snap?.boDungCuId;
    if (!snap || !boId) return { success: false as const, error: "Thiếu ảnh bảng thành phần." };
    await applyApprovedBomLines(supabase, boId, catalogLinesOf(snap.lines));
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
    const nextAttrs = { ...attrs, SET_RECONCILE_STATUS: "BOM_APPROVED" };
    const patch: Record<string, unknown> = { attributes: nextAttrs, updated_at: new Date().toISOString() };
    if (nguoiXacNhanId) patch.nguoi_xac_nhan_id = nguoiXacNhanId;
    const { error: updErr } = await supabase.from("cssd_fact_su_co").update(patch).eq("id", id);
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
    if (readSetReconcileStatus(attrs) !== "BOM_PENDING") {
      return { success: false as const, error: "Phiếu không còn chờ duyệt chuẩn." };
    }
    const { error: updErr } = await supabase
      .from("cssd_fact_su_co")
      .update({
        attributes: { ...attrs, SET_RECONCILE_STATUS: "BOM_REJECTED" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updErr) throw new Error(updErr.message);
    revalidateCssdIncidentSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không từ chối được phiếu." };
  }
}
