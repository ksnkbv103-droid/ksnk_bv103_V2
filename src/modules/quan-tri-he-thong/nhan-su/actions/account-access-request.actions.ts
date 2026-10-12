"use server";

/** Admin: đếm, liệt kê, duyệt, từ chối yêu cầu tài khoản. Public ở `account-access-request-public.actions.ts`. */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";
import { provisionStaffAuthAccount } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import {
  accountEmailsMatch,
  mergeAccountRequest,
  PENDING_ACCOUNT_REQUEST_CONTAINS,
  readAccountRequest,
  type AccountRequestStatus,
} from "../lib/account-access-request";
import {
  decideAccessRequestRow,
  getAccessRequestTicket,
  isAccountAccessRequestTableAvailable,
  listPendingAccessRequestTickets,
  type AccessRequestRow,
} from "../lib/account-access-request-store";
import { verifyCurrentActorPassword } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/lib/admin-reauth";
import { parseOrFirstError } from "@/lib/validations/tai-khoan-nhan-su.validations";
import { approveAccountAccessRequestSchema, approveForgotResetRequestSchema, rejectAccountAccessRequestSchema } from "@/lib/validations/account-access-request.validations";
import { revalidateNhanSuTaiKhoan } from "@/modules/quan-tri-he-thong/actions/revalidate-quan-tri";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

function genPendingMaNv(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YCTK-${stamp}-${rnd}`;
}

/**
 * ACC-1: `id` từ UI là id phiếu (danh sách chờ dựng từ `sys_account_access_request`)
 * hoặc id hồ sơ cũ có `extra_data.account_request.ticket_id`. Chỉ trả phiếu còn CHO_DUYET.
 */
async function resolvePendingTicket(supabase: AdminClient, id: string): Promise<AccessRequestRow | null> {
  let ticket = await getAccessRequestTicket(supabase, id);
  if (!ticket) {
    const { data: staff } = await supabase.from("mdm_nhan_su").select("extra_data").eq("id", id).maybeSingle();
    const tid = readAccountRequest(staff?.extra_data as Record<string, unknown> | null)?.ticket_id;
    if (tid) ticket = await getAccessRequestTicket(supabase, tid);
  }
  return ticket && ticket.status === "CHO_DUYET" ? ticket : null;
}

/** Đóng dấu phiếu mềm cũ trên hồ sơ (dữ liệu trước ACC-1) để bảng Nhân sự hết «Chờ duyệt». */
async function closeLegacySoftRequest(
  supabase: AdminClient,
  staffId: string | null,
  status: Exclude<AccountRequestStatus, "CHO_DUYET">,
  by: string,
  reason?: string,
) {
  if (!staffId) return;
  const { data } = await supabase.from("mdm_nhan_su").select("extra_data").eq("id", staffId).maybeSingle();
  const extra = data?.extra_data as Record<string, unknown> | null;
  const req = readAccountRequest(extra);
  if (!req || req.status !== "CHO_DUYET") return;
  const now = new Date().toISOString();
  const patch =
    status === "DUYET"
      ? { ...req, status, approved_at: now, approved_by: by }
      : { ...req, status, reject_reason: reason, rejected_at: now, rejected_by: by };
  await supabase
    .from("mdm_nhan_su")
    .update({ extra_data: mergeAccountRequest(extra, patch), updated_at: now })
    .eq("id", staffId);
}

const LEGACY_NO_TICKET =
  "Phiếu cũ không có trong bảng phiếu — từ chối và đề nghị người dùng gửi lại.";

/** Admin: số phiếu chờ duyệt — cùng nguồn danh sách `?pending=1` (bảng phiếu; hồ sơ mềm khi chưa có bảng). */
export async function countPendingAccountRequestsAction() {
  try {
    // Hub Tài khoản requires PHAN_QUYEN edit / ADMIN — same gate as provision.
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    if (await isAccountAccessRequestTableAvailable(supabase)) {
      const { count, error } = await supabase
        .from("sys_account_access_request")
        .select("id", { count: "exact", head: true })
        .eq("status", "CHO_DUYET");
      if (error) throw error;
      return { success: true as const, count: count ?? 0 };
    }
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

/** ACC-1: dòng hiển thị dựng từ phiếu (id = id phiếu); hồ sơ gắn kèm chỉ để đối chiếu. */
async function mapTicketsToPendingRows(supabase: AdminClient, tickets: AccessRequestRow[]) {
  const staffIds = [...new Set(tickets.map((t) => t.staff_id).filter((x): x is string => !!x))];
  const staffById = new Map<string, Record<string, unknown>>();
  if (staffIds.length) {
    const { data } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("id, ma_nv, ho_ten, email, khoa_id, ten_khoa, chuc_danh_id, ten_chuc_danh, auth_user_id, is_active, vai_tro_he_thong_ksnk")
      .in("id", staffIds);
    for (const r of data || []) staffById.set(String(r.id), r as Record<string, unknown>);
  }
  return tickets.map((t) => {
    const p = (t.payload || {}) as Record<string, unknown>;
    const st = (t.staff_id && staffById.get(t.staff_id)) || {};
    const pick = (k: string, sk = k) => (p[k] as string | null | undefined) || (st[sk] as string | null | undefined) || null;
    return {
      id: t.id,
      staff_id: t.staff_id,
      ma_nv: pick("ma_nv"),
      ho_ten: pick("ho_ten"),
      email: t.email,
      so_dien_thoai: (p.so_dien_thoai as string | null) || null,
      khoa_id: pick("khoa_id"),
      ten_khoa: (st.ten_khoa as string | null) || null,
      chuc_danh_id: pick("chuc_danh_id"),
      chuc_danh: pick("chuc_danh", "ten_chuc_danh"),
      ten_chuc_danh: pick("chuc_danh", "ten_chuc_danh"),
      auth_user_id: (st.auth_user_id as string | null) || null,
      vai_tro_he_thong_ksnk: (st.vai_tro_he_thong_ksnk as string | null) || null,
      is_active: (st.is_active as boolean | null) ?? false,
      created_at: t.created_at,
      extra_data: {
        email: t.email,
        account_request: {
          status: t.status,
          kind: t.kind,
          ly_do: (p.ly_do as string | undefined) || undefined,
          submitted_at: t.created_at,
          ticket_id: t.id,
          ticket_only: true,
        },
      },
    };
  });
}

/** Admin: danh sách phiếu đang chờ duyệt TK / RESET. */
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

    const tickets = await listPendingAccessRequestTickets(supabase, { start, end, search: params?.search });
    if (tickets) {
      const rows = await mapTicketsToPendingRows(supabase, tickets.rows);
      return { success: true as const, rows, total: tickets.total, page, pageSize };
    }

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
 * Admin duyệt REQUEST theo phiếu: tạo/kích hoạt hồ sơ từ payload phiếu → provision Auth (must_change) + audit.
 * ACC-1: hồ sơ đã có email khác email phiếu thì dừng (đổi email phải qua luồng ADMIN ADM-01).
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
    const ticket = await resolvePendingTicket(supabase, parsed.data.staffId);
    if (!ticket) return { success: false as const, error: LEGACY_NO_TICKET };
    if (ticket.kind === "RESET") {
      return {
        success: false as const,
        error: "Đây là yêu cầu đặt lại MK — dùng «Đặt lại MK» / duyệt RESET.",
      };
    }

    const p = (ticket.payload || {}) as Record<string, unknown>;
    const email = normalizeEmail(ticket.email);
    const nowIso = new Date().toISOString();
    let staffId = ticket.staff_id;
    let deactivateOnFail = false;

    if (staffId) {
      const { data: staff } = await supabase
        .from("v_mdm_nhan_su_full")
        .select("id, email, auth_user_id, is_active, extra_data")
        .eq("id", staffId)
        .maybeSingle();
      if (!staff) return { success: false as const, error: "Không tìm thấy hồ sơ gắn với phiếu." };
      if (staff.auth_user_id) {
        return { success: false as const, error: "Hồ sơ đã có tài khoản đăng nhập — từ chối phiếu này." };
      }
      if (staff.email && !accountEmailsMatch(staff.email, email)) {
        return {
          success: false as const,
          error: "Email trên phiếu khác email hồ sơ — xác minh người xin, sửa email hồ sơ (quản trị) rồi duyệt lại, hoặc từ chối.",
        };
      }
      const extra = { ...((staff.extra_data as Record<string, unknown> | null) || {}), email: staff.email || email };
      const { error: upErr } = await supabase
        .from("mdm_nhan_su")
        .update({ is_active: true, extra_data: extra, updated_at: nowIso })
        .eq("id", staffId);
      if (upErr) throw upErr;
      deactivateOnFail = staff.is_active === false;
    } else {
      const { data: sameEmail } = await supabase.from("v_mdm_nhan_su_full").select("id, email").ilike("email", email).limit(5);
      if ((sameEmail || []).some((r) => accountEmailsMatch(r.email as string | null, email))) {
        return { success: false as const, error: "Email đã thuộc một hồ sơ khác — kiểm tra hồ sơ đó hoặc từ chối phiếu." };
      }
      const maNv = String(p.ma_nv || "").trim();
      if (maNv) {
        const { data: clash } = await supabase.from("mdm_nhan_su").select("id").eq("ma_nv", maNv).maybeSingle();
        if (clash) return { success: false as const, error: "Mã NV trên phiếu đã có hồ sơ — kiểm tra hồ sơ đó hoặc từ chối phiếu." };
      }
      const sdt = String(p.so_dien_thoai || "").trim();
      const { data: inserted, error: insErr } = await supabase
        .from("mdm_nhan_su")
        .insert({
          ho_ten: String(p.ho_ten || "").trim() || email,
          ma_nv: maNv || genPendingMaNv(),
          khoa_id: (p.khoa_id as string | null) || null,
          chuc_danh_id: (p.chuc_danh_id as string | null) || null,
          is_active: true,
          extra_data: { email, ...(sdt ? { so_dien_thoai: sdt } : {}) },
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      staffId = String(inserted.id);
      deactivateOnFail = true;
      await supabase.from("sys_account_access_request").update({ staff_id: staffId }).eq("id", ticket.id);
    }

    const prov = await provisionStaffAuthAccount({ staffId, password: parsed.data.password });
    if (!prov.success) {
      if (deactivateOnFail) {
        await supabase
          .from("mdm_nhan_su")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", staffId);
      }
      return { success: false as const, error: prov.error || "Không tạo được tài khoản." };
    }

    const by = actor.email ?? actor.id;
    await closeLegacySoftRequest(supabase, staffId, "DUYET", by);
    await decideAccessRequestRow(supabase, { ticketId: ticket.id, status: "DUYET", decidedBy: by });

    const { logAdminAction } = await import("@/lib/admin-audit");
    await logAdminAction({
      action: "APPROVE_ACCOUNT_REQUEST",
      targetTable: "mdm_nhan_su",
      targetId: staffId,
      after: { status: "DUYET", kind: "REQUEST", ticket_id: ticket.id },
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
 * Admin duyệt RESET: phiếu CHO_DUYET + kind=RESET (fail closed); ACC-1: email phiếu phải khớp
 * email hồ sơ VÀ email đăng nhập Auth → adminResetStaffPasswordAction (không đổi email) → DUYET.
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
    const ticket = await resolvePendingTicket(supabase, parsedIn.data.staffId);
    if (!ticket) return { success: false as const, error: "Không có phiếu RESET chờ duyệt." };
    if (ticket.kind !== "RESET") {
      return {
        success: false as const,
        error: "Đây không phải phiếu đặt lại MK — dùng duyệt tạo TK.",
      };
    }

    const { data: staff } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("id, email, auth_user_id")
      .eq("id", ticket.staff_id ?? "")
      .maybeSingle();
    if (!staff?.auth_user_id) return { success: false as const, error: "Hồ sơ gắn với phiếu chưa có tài khoản." };
    const { data: authUser } = await supabase.auth.admin.getUserById(String(staff.auth_user_id));
    if (
      !accountEmailsMatch(staff.email as string | null, ticket.email) ||
      !accountEmailsMatch(authUser?.user?.email, ticket.email)
    ) {
      return {
        success: false as const,
        error: "Email trên phiếu không khớp email hồ sơ / email đăng nhập — từ chối phiếu và kiểm tra hồ sơ.",
      };
    }

    const { adminResetStaffPasswordAction } = await import(
      "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions"
    );
    const reset = await adminResetStaffPasswordAction({
      staffId: String(staff.id),
      password: parsedIn.data.password,
      confirmActorPassword: parsedIn.data.confirmActorPassword,
      secondApproverEmail: parsedIn.data.secondApproverEmail,
    });
    if (!reset.success) return reset;

    const by = actor.email ?? actor.id;
    await closeLegacySoftRequest(supabase, String(staff.id), "DUYET", by);
    await decideAccessRequestRow(supabase, { ticketId: ticket.id, status: "DUYET", decidedBy: by });

    revalidateNhanSuTaiKhoan();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

/** Admin từ chối: phiếu → TU_CHOI (+ đóng phiếu mềm cũ trên hồ sơ nếu còn). */
export async function rejectAccountAccessRequest(params: { staffId: string; reason: string }) {
  try {
    const actor = await ensureRbacAdmin();
    const parsed = parseOrFirstError(rejectAccountAccessRequestSchema, params);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const supabase = createAdminSupabaseClient();
    const reason = parsed.data.reason;

    const ticket = await resolvePendingTicket(supabase, parsed.data.staffId);
    if (ticket) {
      const by = actor.email ?? actor.id;
      await decideAccessRequestRow(supabase, { ticketId: ticket.id, status: "TU_CHOI", decidedBy: by, rejectReason: reason });
      await closeLegacySoftRequest(supabase, ticket.staff_id, "TU_CHOI", by, reason);
      const { logAdminAction } = await import("@/lib/admin-audit");
      await logAdminAction({
        action: "REJECT_ACCOUNT_REQUEST",
        targetTable: "sys_account_access_request",
        targetId: ticket.id,
        after: { status: "TU_CHOI", kind: ticket.kind },
        reason,
        actorUserId: actor.id,
        actorEmail: actor.email,
      });
      revalidateNhanSuTaiKhoan();
      return { success: true as const };
    }

    // Nhánh cũ: phiếu mềm trên hồ sơ không có dòng trong bảng phiếu.
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
