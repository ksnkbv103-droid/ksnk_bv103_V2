"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import {
  summarizeDeNghiAfter,
  type CssdCatalogDeNghiKind,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { applyCatalogDeNghiOverwrite } from "@/lib/master-data/cssd-catalog-de-nghi-apply";

async function requireCatalogApprove() {
  try {
    await verifyPermission("DC_LE", "edit");
  } catch {
    await verifyPermission("BO_DC", "edit");
  }
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
