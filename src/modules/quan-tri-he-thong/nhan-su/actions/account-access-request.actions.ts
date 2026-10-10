"use server";

/** Admin: đếm, liệt kê, duyệt, từ chối yêu cầu tài khoản. Public ở `account-access-request-public.actions.ts`. */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";
import { provisionStaffAuthAccount } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { mergeAccountRequest, PENDING_ACCOUNT_REQUEST_CONTAINS, readAccountRequest } from "../lib/account-access-request";
import { decideAccessRequestRow } from "../lib/account-access-request-store";
import { verifyCurrentActorPassword } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/lib/admin-reauth";
import { parseOrFirstError } from "@/lib/validations/tai-khoan-nhan-su.validations";
import { approveAccountAccessRequestSchema, approveForgotResetRequestSchema, rejectAccountAccessRequestSchema } from "@/lib/validations/account-access-request.validations";
import { revalidateNhanSuTaiKhoan } from "@/modules/quan-tri-he-thong/actions/revalidate-quan-tri";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Admin: số hồ sơ chờ duyệt — cùng lọc danh sách `?pending=1`, không đếm bảng phiếu. */
export async function countPendingAccountRequestsAction() {
  try {
    // Hub Tài khoản requires PHAN_QUYEN edit / ADMIN — same gate as provision.
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    const { count, error } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("id", { count: "exact", head: true })
      .contains("extra_data", PENDING_ACCOUNT_REQUEST_CONTAINS);
    if (error) throw error;
    return { success: true as const, count: count ?? 0 };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e), count: 0 };
  }
}

/** Admin: danh sách hồ sơ đang chờ duyệt TK / RESET. */
export async function listPendingAccountRequests(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  try {
    // ADM-07: cùng cổng với duyệt / đếm (ensureRbacAdmin), không mở PII cho NHAN_SU.view.
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase
      .from("v_mdm_nhan_su_full")
      .select(
        "id, ma_nv, ho_ten, email, so_dien_thoai, khoa_id, ten_khoa, chuc_danh_id, ten_chuc_danh, auth_user_id, is_active, extra_data, created_at",
        { count: "exact" },
      )
      .contains("extra_data", PENDING_ACCOUNT_REQUEST_CONTAINS);
    const searchFilter = buildSupabaseSearchFilter(params?.search, ["ho_ten", "ma_nv", "email"]);
    if (searchFilter) query = query.or(searchFilter);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) throw error;
    return {
      success: true as const,
      rows: data || [],
      total: count ?? 0,
      page,
      pageSize,
    };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

/**
 * Admin duyệt REQUEST: kích hoạt + provision Auth (must_change) + audit.
 * Yêu cầu re-auth mật khẩu admin hiện tại.
 */
export async function approveAccountAccessRequest(params: {
  staffId: string;
  password: string;
  confirmActorPassword: string;
}) {
  try {
    const actor = await ensureRbacAdmin();
    const parsed = parseOrFirstError(approveAccountAccessRequestSchema, params);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const reauth = await verifyCurrentActorPassword(parsed.data.confirmActorPassword);
    if (!reauth.ok) return { success: false as const, error: reauth.error };

    const supabase = createAdminSupabaseClient();
    const pw = parsed.data.password;

    const { data: staff, error: sErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, extra_data, is_active, auth_user_id")
      .eq("id", parsed.data.staffId)
      .maybeSingle();
    if (sErr || !staff) return { success: false as const, error: "Không tìm thấy hồ sơ." };

    const req = readAccountRequest(staff.extra_data as Record<string, unknown> | null);
    if (!req || req.status !== "CHO_DUYET") {
      return { success: false as const, error: "Hồ sơ không ở trạng thái chờ duyệt TK." };
    }
    if ((req.kind || "REQUEST") === "RESET") {
      return {
        success: false as const,
        error: "Đây là yêu cầu đặt lại MK — dùng «Đặt lại MK» / duyệt RESET.",
      };
    }

    const wasInactive = staff.is_active === false;
    if (wasInactive) {
      const { error: actErr } = await supabase
        .from("mdm_nhan_su")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", staff.id);
      if (actErr) throw actErr;
    }

    if (!staff.auth_user_id) {
      const prov = await provisionStaffAuthAccount({ staffId: staff.id, password: pw });
      if (!prov.success) {
        if (wasInactive) {
          await supabase
            .from("mdm_nhan_su")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", staff.id);
        }
        return { success: false as const, error: prov.error || "Không tạo được tài khoản." };
      }
    }

    const { data: fresh } = await supabase
      .from("mdm_nhan_su")
      .select("extra_data")
      .eq("id", staff.id)
      .maybeSingle();
    const extra = mergeAccountRequest(fresh?.extra_data as Record<string, unknown> | null, {
      ...req,
      status: "DUYET",
      approved_at: new Date().toISOString(),
      approved_by: actor.email ?? actor.id,
    });
    await supabase
      .from("mdm_nhan_su")
      .update({ extra_data: extra, updated_at: new Date().toISOString() })
      .eq("id", staff.id);

    await decideAccessRequestRow(supabase, {
      ticketId: req.ticket_id,
      staffId: staff.id,
      status: "DUYET",
      decidedBy: actor.email ?? actor.id,
    });

    const { logAdminAction } = await import("@/lib/admin-audit");
    await logAdminAction({
      action: "APPROVE_ACCOUNT_REQUEST",
      targetTable: "mdm_nhan_su",
      targetId: staff.id,
      after: { status: "DUYET", kind: req.kind || "REQUEST" },
      actorUserId: actor.id,
      actorEmail: actor.email,
    });

    revalidateNhanSuTaiKhoan();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

/**
 * Admin duyệt RESET: xác nhận phiếu CHO_DUYET + kind=RESET (fail closed) →
 * adminResetStaffPasswordAction → đánh dấu DUYET.
 */
export async function approveForgotResetRequest(params: {
  staffId: string;
  password: string;
  confirmActorPassword: string;
  secondApproverEmail?: string;
}) {
  try {
    // Fail closed: phiếu RESET phải CHO_DUYET trước khi đụng mật khẩu (UI gate không đủ).
    const actor = await ensureRbacAdmin();
    const parsedIn = parseOrFirstError(approveForgotResetRequestSchema, params);
    if (!parsedIn.ok) return { success: false as const, error: parsedIn.error };
    const supabase = createAdminSupabaseClient();
    const { data: staff, error: sErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, extra_data")
      .eq("id", parsedIn.data.staffId)
      .maybeSingle();
    if (sErr || !staff) return { success: false as const, error: "Không tìm thấy hồ sơ." };

    const req = readAccountRequest(staff.extra_data as Record<string, unknown> | null);
    if (!req || req.status !== "CHO_DUYET") {
      return { success: false as const, error: "Không có phiếu RESET chờ duyệt." };
    }
    if ((req.kind || "REQUEST") !== "RESET") {
      return {
        success: false as const,
        error: "Đây không phải phiếu đặt lại MK — dùng duyệt tạo TK.",
      };
    }

    const { adminResetStaffPasswordAction } = await import(
      "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions"
    );
    const reset = await adminResetStaffPasswordAction({
      staffId: parsedIn.data.staffId,
      password: parsedIn.data.password,
      confirmActorPassword: parsedIn.data.confirmActorPassword,
      secondApproverEmail: parsedIn.data.secondApproverEmail,
    });
    if (!reset.success) return reset;

    const { data: fresh } = await supabase
      .from("mdm_nhan_su")
      .select("extra_data")
      .eq("id", parsedIn.data.staffId)
      .maybeSingle();
    const extra = mergeAccountRequest(fresh?.extra_data as Record<string, unknown> | null, {
      ...req,
      status: "DUYET",
      approved_at: new Date().toISOString(),
      approved_by: actor.email ?? actor.id,
    });
    await supabase
      .from("mdm_nhan_su")
      .update({ extra_data: extra, updated_at: new Date().toISOString() })
      .eq("id", parsedIn.data.staffId);
    await decideAccessRequestRow(supabase, {
      ticketId: req.ticket_id,
      staffId: parsedIn.data.staffId,
      status: "DUYET",
      decidedBy: actor.email ?? actor.id,
    });

    revalidateNhanSuTaiKhoan();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

/** Admin từ chối: status TU_CHOI + lý do trong extra_data (+ bảng phiếu nếu có). */
export async function rejectAccountAccessRequest(params: { staffId: string; reason: string }) {
  try {
    const actor = await ensureRbacAdmin();
    const parsed = parseOrFirstError(rejectAccountAccessRequestSchema, params);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const supabase = createAdminSupabaseClient();
    const reason = parsed.data.reason;

    const { data: staff, error: sErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, extra_data, is_active, auth_user_id")
      .eq("id", parsed.data.staffId)
      .maybeSingle();
    if (sErr || !staff) return { success: false as const, error: "Không tìm thấy hồ sơ." };

    const req = readAccountRequest(staff.extra_data as Record<string, unknown> | null);
    if (!req || req.status !== "CHO_DUYET") {
      return { success: false as const, error: "Hồ sơ không ở trạng thái chờ duyệt TK." };
    }

    const extra = mergeAccountRequest(staff.extra_data as Record<string, unknown> | null, {
      ...req,
      status: "TU_CHOI",
      reject_reason: reason,
      rejected_at: new Date().toISOString(),
      rejected_by: actor.email ?? actor.id,
    });

    const patch: Record<string, unknown> = {
      extra_data: extra,
      updated_at: new Date().toISOString(),
    };
    if (!staff.auth_user_id && staff.is_active !== true) {
      patch.is_active = false;
    }

    const { error: upErr } = await supabase.from("mdm_nhan_su").update(patch).eq("id", staff.id);
    if (upErr) throw upErr;

    await decideAccessRequestRow(supabase, {
      ticketId: req.ticket_id,
      staffId: staff.id,
      status: "TU_CHOI",
      decidedBy: actor.email ?? actor.id,
      rejectReason: reason,
    });

    try {
      const prev = Array.isArray(extra.auth_audit) ? [...(extra.auth_audit as unknown[])] : [];
      prev.push({
        actor_id: actor.id,
        actor_email: actor.email ?? null,
        action: "reject_request",
        staff_id: staff.id,
        ts: new Date().toISOString(),
        kind: req.kind || "REQUEST",
      });
      extra.auth_audit = prev.slice(-40);
      await supabase.from("mdm_nhan_su").update({ extra_data: extra }).eq("id", staff.id);
    } catch (auditErr) {
      console.error("[auth_audit] reject_request failed:", auditErr);
    }

    const { logAdminAction } = await import("@/lib/admin-audit");
    await logAdminAction({
      action: "REJECT_ACCOUNT_REQUEST",
      targetTable: "mdm_nhan_su",
      targetId: staff.id,
      after: { status: "TU_CHOI", kind: req.kind || "REQUEST" },
      reason,
      actorUserId: actor.id,
      actorEmail: actor.email,
    });

    revalidateNhanSuTaiKhoan();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}
