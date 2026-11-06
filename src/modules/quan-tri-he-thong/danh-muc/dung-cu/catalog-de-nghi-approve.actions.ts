"use server";

import { z } from "zod";
import { logAdminAction } from "@/lib/admin-audit";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getActorRoleNames } from "@/lib/server-permission";
import { revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import { revalidateMasterDataRowCacheTag } from "@/lib/cache/revalidate-master-data-tags";
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

const ticketIdSchema = z.string().trim().uuid("Mã phiếu không hợp lệ.");

const CLAIMED_MSG = "Phiếu đã được xử lý hoặc không còn chờ duyệt.";
/** Tiền tố reject_reason khi danh mục đã ghi nhưng chưa chốt APPROVED (enum DB không có trạng thái riêng). */
const APPLIED_PREFIX = "Đã ghi danh mục";
const APPLIED_REJECT_MSG =
  "Phiếu này đã ghi vào danh mục nhưng chưa chốt được trạng thái, không thể từ chối. Hãy kiểm tra danh mục và nhờ kỹ thuật chốt phiếu thành APPROVED thủ công.";

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

/** Đưa phiếu đang APPLYING sang APPLY_FAILED (không kẹt); lỗi ghi trạng thái chỉ log. */
async function markClaimFailed(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  ticketId: string,
  reason: string,
) {
  const { error } = await supabase
    .from("cssd_catalog_de_nghi")
    .update({
      status: CATALOG_DE_NGHI_FAILED_STATUS,
      reject_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .eq("status", CATALOG_DE_NGHI_CLAIM_STATUS);
  if (error) {
    console.error({ module: "catalog-de-nghi", action: "markClaimFailed", ticketId, error: error.message });
  }
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
    const parsedId = ticketIdSchema.safeParse(id);
    if (!parsedId.success) return { success: false as const, error: parsedId.error.issues[0]?.message || "Thiếu phiếu." };
    const ticketId = parsedId.data;
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
      await markClaimFailed(supabase, ticketId, short);
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
    if (updErr) {
      // Dữ liệu đã ghi nhưng không chốt được APPROVED: không để kẹt APPLYING.
      const msg = `${APPLIED_PREFIX} nhưng không chốt được phiếu: ${updErr.message}`;
      await markClaimFailed(supabase, ticketId, msg.slice(0, 400));
      return { success: false as const, error: msg };
    }
    await logAdminAction({
      action: "APPROVE_CATALOG_DE_NGHI",
      targetTable: "cssd_catalog_de_nghi",
      targetId: ticketId,
      before: { status: "PENDING", payload_before: claimed.payload_before ?? null },
      after: { status: "APPROVED", kind, target_ma: claimed.target_ma ?? null, payload_after: claimed.payload_after ?? null },
    });
    let heatSplitNote: string | undefined;
    try {
      heatSplitNote =
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
    } catch (heatErr: unknown) {
      // Phiếu đã APPROVED và danh mục đã ghi; lỗi tách nhiệt chỉ cảnh báo.
      heatSplitNote = `Phiếu đã duyệt nhưng tách nhiệt lỗi: ${heatErr instanceof Error ? heatErr.message : "không rõ"}`;
    }
    revalidateCssdInventorySurfaces();
    revalidateMasterDataRowCacheTag(kind === "BO" ? "cssd_dm_bo_dung_cu" : "cssd_dm_loai_dung_cu");
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
    const parsedId = ticketIdSchema.safeParse(id);
    if (!parsedId.success) return { success: false as const, error: parsedId.error.issues[0]?.message || "Thiếu phiếu." };
    const ticketId = parsedId.data;
    const supabase = createAdminSupabaseClient();
    const { data: row, error: loadErr } = await supabase
      .from("cssd_catalog_de_nghi")
      .select("id, status, reject_reason")
      .eq("id", ticketId)
      .maybeSingle();
    if (loadErr || !row) return { success: false as const, error: loadErr?.message || "Không thấy phiếu." };
    const st = String(row.status || "");
    if (!canRejectCatalogDeNghi(st)) {
      return { success: false as const, error: CLAIMED_MSG };
    }
    if (st === CATALOG_DE_NGHI_FAILED_STATUS && String(row.reject_reason || "").startsWith(APPLIED_PREFIX)) {
      return { success: false as const, error: APPLIED_REJECT_MSG };
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
    await logAdminAction({
      action: "REJECT_CATALOG_DE_NGHI",
      targetTable: "cssd_catalog_de_nghi",
      targetId: ticketId,
      before: { status: st },
      after: { status: "REJECTED", reject_reason: String(reason || "").trim() || null },
    });
    revalidateCssdInventorySurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không từ chối được phiếu.",
    };
  }
}
