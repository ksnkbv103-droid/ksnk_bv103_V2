"use server";

import { fetchAllRangeRows } from "@/lib/fetch-all-range";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getActorRoleNames, verifyPermission } from "@/lib/server-permission";
import { revalidateCssdIncidentSurfaces, revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import { checkCatalogApprover, resolveCatalogApprover } from "@/lib/master-data/cssd-catalog-approver-guard";
import { catalogLinesOf } from "../application/set-reconcile-incident.application";
import {
  canClaimBomApprove,
  canRejectBomApprove,
  isBomApproveHistoryStatus,
} from "@/lib/domain/cssd-set-reconcile";
import { formatCatalogApprovalDiff } from "@/lib/domain/cssd-catalog-master-write";
import {
  parseSetReconcileSnapshot,
  readSetReconcileStatus,
} from "../domain/cssd-set-reconcile-attrs";

async function requireCatalogRead() {
  try {
    await verifyPermission("BO_DC", "view");
  } catch {
    await verifyPermission("DC_LE", "view");
  }
}

/** PO 2026-10-27: chỉ chủ nhiệm khoa (ADMIN) duyệt phiếu rà soát bộ — kiểm ở server, không chỉ ẩn UI. */
async function requireCatalogApprove() {
  const roles = await getActorRoleNames();
  if (!roles.includes("ADMIN")) throw new Error("Chỉ chủ nhiệm khoa (ADMIN) được duyệt phiếu rà soát bộ.");
}

const CLAIMED_MSG = "Phiếu đã được xử lý hoặc không còn chờ duyệt.";

export async function listPendingBomApprovalsAction() {
  try {
    await requireCatalogRead();
    const supabase = createAdminSupabaseClient();
    // PA1: đọc hết phiếu INSTRUMENT rồi lọc BOM_PENDING — hết cắt 80 làm mất hàng chờ cũ.
    const data = await fetchAllRangeRows<{
      id: string;
      mo_ta: string | null;
      created_at: string | null;
      ma_qr_quy_trinh: string | null;
      attributes: Record<string, unknown> | null;
    }>((from, to) =>
      supabase
        .from("v_cssd_su_co_full")
        .select("id, mo_ta, created_at, ma_qr_quy_trinh, attributes")
        .eq("incident_group", "INSTRUMENT")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    );
    const rows = data
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
    const data = await fetchAllRangeRows<{
      id: string;
      mo_ta: string | null;
      created_at: string | null;
      ma_qr_quy_trinh: string | null;
      attributes: Record<string, unknown> | null;
    }>((from, to) =>
      supabase
        .from("v_cssd_su_co_full")
        .select("id, mo_ta, created_at, ma_qr_quy_trinh, attributes")
        .eq("incident_group", "INSTRUMENT")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    );
    const rows = data
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
    const { data, error } = await supabase
      .from("cssd_fact_su_co")
      .select("id, attributes, nguoi_bao_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return { success: false as const, error: error?.message || "Không thấy phiếu." };
    const attrs = (data.attributes as Record<string, unknown>) || {};
    if (!canClaimBomApprove(readSetReconcileStatus(attrs))) {
      return { success: false as const, error: CLAIMED_MSG };
    }
    // KD-1: chặn tự duyệt + bắt buộc người duyệt TRƯỚC khi claim.
    const approver = await resolveCatalogApprover(supabase);
    const gate = checkCatalogApprover(approver, {
      nhanSuId: String(data.nguoi_bao_id || attrs.NGUOI_PHAT_HIEN_ID || "").trim() || null,
      authUserId: String(attrs.REPORTER_AUTH_USER_ID || "").trim() || null,
    });
    if (!gate.ok) return { success: false as const, error: gate.error };
    // KD-1: claim → apply → mark gộp một giao dịch DB; lỗi → rollback, phiếu giữ BOM_PENDING.
    const { data: rpcData, error: rpcErr } = await supabase.rpc("fn_cssd_apply_bom_lines_tx", {
      p_incident_id: id,
      p_approver_auth_user_id: approver.authUserId,
      p_approver_is_admin: approver.isAdmin,
    });
    if (rpcErr) {
      // P0001 = RAISE EXCEPTION trong RPC (thông báo đã là tiếng Việt cho người dùng).
      if (rpcErr.code === "P0001" && rpcErr.message) return { success: false as const, error: rpcErr.message };
      console.error({ module: "cssd-su-co", action: "approveSetReconcileBom", error: rpcErr.message });
      return { success: false as const, error: "Không áp dụng được bảng thành phần. Phiếu vẫn chờ duyệt — thử lại sau." };
    }
    if (!rpcData) return { success: false as const, error: CLAIMED_MSG };
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
