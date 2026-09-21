"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import {
  catalogDeNghiTargetsOverlap,
  collectCatalogDeNghiTargetKeys,
  summarizeDeNghiAfter,
  type CssdCatalogDeNghiKind,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import {
  applyCatalogDeNghiOverwrite,
  revertCatalogDeNghiOverwrite,
} from "@/lib/master-data/cssd-catalog-de-nghi-apply";

async function requireCatalogApprove() {
  await verifyAnyPermission([
    { moduleKey: "DC_LE", action: "edit" },
    { moduleKey: "BO_DC", action: "edit" },
  ]);
}

function mapRow(r: Record<string, unknown>): CssdCatalogDeNghiRow & { afterSummary: string } {
  const targetKind = String(r.target_kind) as CssdCatalogDeNghiKind;
  const payloadAfter = (r.payload_after as Record<string, unknown>) || {};
  return {
    id: String(r.id),
    targetKind,
    targetId: r.target_id ? String(r.target_id) : null,
    targetMa: String(r.target_ma || ""),
    targetTen: String(r.target_ten || ""),
    payloadBefore: (r.payload_before as Record<string, unknown>) || {},
    payloadAfter,
    note: String(r.note || ""),
    status: String(r.status) as CssdCatalogDeNghiRow["status"],
    nguoiDeNghiId: r.nguoi_de_nghi_id ? String(r.nguoi_de_nghi_id) : null,
    approvedById: r.approved_by_id ? String(r.approved_by_id) : null,
    approvedAt: r.approved_at ? String(r.approved_at) : null,
    rejectReason: String(r.reject_reason || ""),
    createdAt: r.created_at ? String(r.created_at) : "",
    afterSummary: summarizeDeNghiAfter(targetKind, payloadAfter),
  };
}

export async function listPendingCatalogDeNghiAction() {
  try {
    await requireCatalogApprove();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("cssd_catalog_de_nghi")
      .select(
        "id, target_kind, target_id, target_ma, target_ten, payload_before, payload_after, note, status, nguoi_de_nghi_id, approved_by_id, approved_at, reject_reason, created_at",
      )
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return {
      success: true as const,
      data: (data || []).map((r) => mapRow(r as Record<string, unknown>)),
    };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tải hàng chờ đề nghị.",
      data: [],
    };
  }
}

export async function listApprovedCatalogDeNghiAction(limit = 40) {
  try {
    await requireCatalogApprove();
    const supabase = createAdminSupabaseClient();
    const size = Math.min(Math.max(limit, 1), 100);
    const { data, error } = await supabase
      .from("cssd_catalog_de_nghi")
      .select(
        "id, target_kind, target_id, target_ma, target_ten, payload_before, payload_after, note, status, nguoi_de_nghi_id, approved_by_id, approved_at, reject_reason, created_at",
      )
      .eq("status", "APPROVED")
      .order("approved_at", { ascending: false })
      .limit(size);
    if (error) throw new Error(error.message);
    return {
      success: true as const,
      data: (data || []).map((r) => mapRow(r as Record<string, unknown>)),
    };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tải phiếu đã duyệt.",
      data: [],
    };
  }
}

export async function approveCatalogDeNghiAction(id: string) {
  try {
    await requireCatalogApprove();
    const ticketId = String(id || "").trim();
    if (!ticketId) return { success: false as const, error: "Thiếu phiếu." };
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("cssd_catalog_de_nghi")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();
    if (error || !data) return { success: false as const, error: error?.message || "Không thấy phiếu." };
    if (String(data.status) !== "PENDING") {
      return { success: false as const, error: "Phiếu không còn PENDING." };
    }
    const kind = String(data.target_kind) as CssdCatalogDeNghiKind;
    await applyCatalogDeNghiOverwrite(supabase, {
      kind,
      targetId: data.target_id ? String(data.target_id) : null,
      targetMa: String(data.target_ma || ""),
      payloadAfter: (data.payload_after as Record<string, unknown>) || {},
      payloadBefore: (data.payload_before as Record<string, unknown>) || {},
    });
    let approvedBy: string | null = null;
    try {
      const uc = await createServerSupabaseUserClient();
      const u = await uc.auth.getUser();
      const { data: ns } = await supabase
        .from("mdm_nhan_su")
        .select("id")
        .eq("auth_user_id", u.data.user?.id || "")
        .maybeSingle();
      approvedBy = ns?.id ? String(ns.id) : null;
    } catch {
      /* ignore */
    }
    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .update({
        status: "APPROVED",
        approved_by_id: approvedBy,
        approved_at: now,
        updated_at: now,
      })
      .eq("id", ticketId)
      .eq("status", "PENDING");
    if (updErr) throw new Error(updErr.message);
    revalidateCssdInventorySurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không duyệt được phiếu.",
    };
  }
}

export async function rejectCatalogDeNghiAction(id: string, reason?: string | null) {
  try {
    await requireCatalogApprove();
    const ticketId = String(id || "").trim();
    if (!ticketId) return { success: false as const, error: "Thiếu phiếu." };
    const supabase = createAdminSupabaseClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("cssd_catalog_de_nghi")
      .update({
        status: "REJECTED",
        reject_reason: String(reason || "").trim() || null,
        updated_at: now,
      })
      .eq("id", ticketId)
      .eq("status", "PENDING");
    if (error) throw new Error(error.message);
    revalidateCssdInventorySurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không từ chối được phiếu.",
    };
  }
}

export async function deleteCatalogDeNghiAction(id: string) {
  try {
    await requireCatalogApprove();
    const ticketId = String(id || "").trim();
    if (!ticketId) return { success: false as const, error: "Thiếu phiếu." };
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("cssd_catalog_de_nghi")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();
    if (error || !data) {
      return { success: false as const, error: error?.message || "Không thấy phiếu." };
    }
    const status = String(data.status || "");

    if (status === "PENDING" || status === "REJECTED") {
      const { error: delErr } = await supabase
        .from("cssd_catalog_de_nghi")
        .delete()
        .eq("id", ticketId);
      if (delErr) throw new Error(delErr.message);
      revalidateCssdInventorySurfaces();
      return {
        success: true as const,
        message: status === "PENDING" ? "Đã xóa phiếu chờ duyệt." : "Đã xóa phiếu khỏi lịch sử.",
      };
    }

    if (status !== "APPROVED") {
      return { success: false as const, error: `Không xóa được phiếu trạng thái ${status}.` };
    }

    const kind = String(data.target_kind) as CssdCatalogDeNghiKind;
    const payloadBefore = (data.payload_before as Record<string, unknown>) || {};
    const payloadAfter = (data.payload_after as Record<string, unknown>) || {};
    const createdAt = data.created_at ? String(data.created_at) : "";
    const approvedAt = data.approved_at ? String(data.approved_at) : createdAt;
    const myKeys = collectCatalogDeNghiTargetKeys({
      targetKind: kind,
      targetId: data.target_id ? String(data.target_id) : null,
      targetMa: String(data.target_ma || ""),
      payloadBefore,
      payloadAfter,
    });

    // Phiếu APPROVED sau (created_at hoặc approved_at lớn hơn) chạm cùng đích → chặn
    const { data: laterRows, error: laterErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .select(
        "id, target_kind, target_id, target_ma, payload_before, payload_after, created_at, approved_at, status",
      )
      .eq("status", "APPROVED")
      .neq("id", ticketId)
      .limit(200);
    if (laterErr) throw new Error(laterErr.message);

    for (const row of laterRows || []) {
      const rCreated = row.created_at ? String(row.created_at) : "";
      const rApproved = row.approved_at ? String(row.approved_at) : "";
      const isLater =
        (createdAt && rCreated > createdAt) ||
        (approvedAt && rApproved && rApproved > approvedAt) ||
        (approvedAt && rCreated > approvedAt);
      if (!isLater) continue;
      const otherKeys = collectCatalogDeNghiTargetKeys({
        targetKind: String(row.target_kind) as CssdCatalogDeNghiKind,
        targetId: row.target_id ? String(row.target_id) : null,
        targetMa: String(row.target_ma || ""),
        payloadBefore: (row.payload_before as Record<string, unknown>) || {},
        payloadAfter: (row.payload_after as Record<string, unknown>) || {},
      });
      if (catalogDeNghiTargetsOverlap(myKeys, otherKeys)) {
        return {
          success: false as const,
          error:
            "Có phiếu đã duyệt sau chạm cùng danh mục — hãy hoàn tác / xóa phiếu mới hơn trước.",
        };
      }
    }

    await revertCatalogDeNghiOverwrite(supabase, {
      kind,
      targetId: data.target_id ? String(data.target_id) : null,
      targetMa: String(data.target_ma || ""),
      payloadBefore,
      payloadAfter,
    });

    const { error: delErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .delete()
      .eq("id", ticketId);
    if (delErr) throw new Error(delErr.message);

    revalidateCssdInventorySurfaces();
    return {
      success: true as const,
      message: "Đã xóa phiếu và hoàn tác danh mục về trước duyệt.",
    };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không xóa / hoàn tác được phiếu.",
    };
  }
}
