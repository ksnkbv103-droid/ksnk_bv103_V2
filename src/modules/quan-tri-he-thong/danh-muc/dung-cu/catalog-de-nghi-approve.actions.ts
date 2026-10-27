"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getActorRoleNames } from "@/lib/server-permission";
import { revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import {
  CATALOG_DE_NGHI_CLAIM_STATUS,
  CATALOG_DE_NGHI_FAILED_STATUS,
  canRejectCatalogDeNghi,
  summarizeDeNghiAfter,
  type CssdCatalogDeNghiKind,
  type CssdCatalogDeNghiRow,
} from "@/lib/domain/cssd-catalog-de-nghi";
import { applyCatalogDeNghiOverwrite } from "@/lib/master-data/cssd-catalog-de-nghi-apply";
import { applyHeatSplitForLoaiChanges } from "@/modules/cssd-erp/workflow/application/cssd-heat-split-apply";
import { checkCatalogApprover, resolveCatalogApprover } from "@/lib/master-data/cssd-catalog-approver-guard";

/** PO 2026-10-27: chỉ chủ nhiệm khoa (ADMIN) duyệt phiếu danh mục. */
async function requireCatalogApprove() {
  const roles = await getActorRoleNames();
  if (!roles.includes("ADMIN")) throw new Error("Chỉ chủ nhiệm khoa (ADMIN) được duyệt phiếu danh mục.");
}

const CLAIMED_MSG = "Phiếu đã được xử lý hoặc không còn chờ duyệt.";

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
    // KD-1: chặn tự duyệt + bắt buộc người duyệt TRƯỚC khi claim (không để phiếu kẹt APPLYING).
    const { data: ticket, error: ticketErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .select("id, status, nguoi_de_nghi_id")
      .eq("id", ticketId)
      .maybeSingle();
    if (ticketErr) throw new Error(ticketErr.message);
    if (!ticket || String(ticket.status) !== "PENDING") return { success: false as const, error: CLAIMED_MSG };
    const approver = await resolveCatalogApprover(supabase);
    const gate = checkCatalogApprover(
      approver,
      { nhanSuId: ticket.nguoi_de_nghi_id ? String(ticket.nguoi_de_nghi_id) : null },
      { adminMaySelfApprove: true },
    );
    if (!gate.ok) return { success: false as const, error: gate.error };
    const approvedBy = gate.approvedById;

    const now = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .update({
        status: CATALOG_DE_NGHI_CLAIM_STATUS,
        updated_at: now,
      })
      .eq("id", ticketId)
      .eq("status", "PENDING")
      .select("*")
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) {
      return { success: false as const, error: CLAIMED_MSG };
    }

    const kind = String(claimed.target_kind) as CssdCatalogDeNghiKind;
    let heatChanges: Awaited<ReturnType<typeof applyCatalogDeNghiOverwrite>> = [];
    try {
      heatChanges = await applyCatalogDeNghiOverwrite(supabase, {
        kind,
        targetId: claimed.target_id ? String(claimed.target_id) : null,
        targetMa: String(claimed.target_ma || ""),
        payloadAfter: (claimed.payload_after as Record<string, unknown>) || {},
        payloadBefore: (claimed.payload_before as Record<string, unknown>) || {},
      });
    } catch (applyErr: unknown) {
      const msg = applyErr instanceof Error ? applyErr.message : "Không ghi được danh mục.";
      const short = msg.slice(0, 400);
      await supabase
        .from("cssd_catalog_de_nghi")
        .update({
          status: CATALOG_DE_NGHI_FAILED_STATUS,
          reject_reason: short,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .eq("status", CATALOG_DE_NGHI_CLAIM_STATUS);
      return { success: false as const, error: msg };
    }

    const approvedAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .update({
        status: "APPROVED",
        approved_by_id: approvedBy,
        approved_at: approvedAt,
        updated_at: approvedAt,
        reject_reason: null,
      })
      .eq("id", ticketId)
      .eq("status", CATALOG_DE_NGHI_CLAIM_STATUS);
    if (updErr) throw new Error(updErr.message);
    const heatSplitNote =
      (
        await applyHeatSplitForLoaiChanges(
          supabase,
          heatChanges.map((c) => ({
            loaiId: c.loaiId,
            prevIsChiuNhiet: c.prevIsChiuNhiet,
            nextIsChiuNhiet: c.nextIsChiuNhiet,
          })),
        )
      ).join(" ") || undefined;
    revalidateCssdInventorySurfaces();
    return { success: true as const, heatSplitNote };
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
    const { data: row, error: loadErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .select("id, status")
      .eq("id", ticketId)
      .maybeSingle();
    if (loadErr || !row) return { success: false as const, error: loadErr?.message || "Không thấy phiếu." };
    const st = String(row.status || "");
    if (!canRejectCatalogDeNghi(st)) {
      return { success: false as const, error: CLAIMED_MSG };
    }
    const now = new Date().toISOString();
    const { data: rejected, error } = await supabase
      .from("cssd_catalog_de_nghi")
      .update({
        status: "REJECTED",
        reject_reason: String(reason || "").trim() || null,
        updated_at: now,
      })
      .eq("id", ticketId)
      .in("status", ["PENDING", "APPLY_FAILED"])
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rejected?.id) return { success: false as const, error: CLAIMED_MSG };
    revalidateCssdInventorySurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không từ chối được phiếu.",
    };
  }
}
