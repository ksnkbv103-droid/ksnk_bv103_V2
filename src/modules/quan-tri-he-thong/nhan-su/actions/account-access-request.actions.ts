"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";
import { verifyPermission } from "../../actions/verify-permission";
import { provisionStaffAuthAccount } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions";
import {
  formatAccountRequestTicketCode,
  isPendingAccountRequest,
  mergeAccountRequest,
  readAccountRequest,
  type AccountRequestMeta,
} from "../lib/account-access-request";
import {
  countPendingAccessRequests,
  decideAccessRequestRow,
  insertAccessRequestRow,
  lookupAccessRequestFromTable,
} from "../lib/account-access-request-store";
import { verifyCurrentActorPassword } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/lib/admin-reauth";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Light in-memory cooldown per email (best-effort on warm instances). */
const submitCooldown = new Map<string, number>();
const SUBMIT_COOLDOWN_MS = 45_000;

function assertSubmitCooldown(email: string): string | null {
  const now = Date.now();
  const prev = submitCooldown.get(email) ?? 0;
  if (now - prev < SUBMIT_COOLDOWN_MS) {
    return "Bạn vừa gửi yêu cầu. Vui lòng chờ khoảng 1 phút rồi thử lại.";
  }
  submitCooldown.set(email, now);
  if (submitCooldown.size > 500) {
    const cutoff = now - SUBMIT_COOLDOWN_MS * 2;
    for (const [k, t] of submitCooldown) {
      if (t < cutoff) submitCooldown.delete(k);
    }
  }
  return null;
}

function genPendingMaNv(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YCTK-${stamp}-${rnd}`;
}

/** Public: danh sách khoa/phòng cho form xin cấp TK (chỉ id + tên). */
export async function listPublicKhoaOptionsForAccountRequestAction() {
  try {
    const rows = await getCachedDmKhoaPhong();
    return {
      success: true as const,
      data: (rows || []).map((k) => ({
        id: String(k.id),
        ten_khoa: String(k.ten_khoa || ""),
        ma_khoa: String(k.ma_khoa || ""),
      })),
    };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

export type SubmitAccountAccessRequestInput = {
  ho_ten: string;
  email: string;
  ma_nv?: string;
  so_dien_thoai?: string;
  khoa_id?: string;
  chuc_danh?: string;
  ly_do: string;
};

/**
 * Public (unauthenticated): tạo / gắn phiếu xin cấp TK trên hồ sơ soft-pending
 * (`is_active=false` khi tạo mới; `extra_data.account_request.status=CHO_DUYET`).
 * Dual-write `sys_account_access_request` khi bảng đã migrate.
 * Không tạo Auth user.
 */
export async function submitAccountAccessRequestAction(input: SubmitAccountAccessRequestInput) {
  try {
    const hoTen = String(input.ho_ten || "").trim();
    const email = normalizeEmail(String(input.email || ""));
    const maNv = String(input.ma_nv || "").trim();
    const sdt = String(input.so_dien_thoai || "").trim();
    const khoaId = String(input.khoa_id || "").trim() || null;
    const chucDanh = String(input.chuc_danh || "").trim();
    const lyDo = String(input.ly_do || "").trim();

    if (!hoTen || hoTen.length < 2) {
      return { success: false as const, error: "Họ tên không hợp lệ." };
    }
    if (!email || !email.includes("@")) {
      return { success: false as const, error: "Email không hợp lệ." };
    }
    if (!lyDo || lyDo.length < 5) {
      return { success: false as const, error: "Lý do xin cấp tài khoản tối thiểu 5 ký tự." };
    }

    const coolErr = assertSubmitCooldown(email);
    if (coolErr) return { success: false as const, error: coolErr };

    const supabase = createAdminSupabaseClient();

    type ExistingStaffRow = {
      id: string;
      ma_nv: string | null;
      ho_ten: string | null;
      auth_user_id: string | null;
      is_active: boolean | null;
      extra_data: Record<string, unknown> | null;
      khoa_id: string | null;
    };

    let existing: ExistingStaffRow | null = null;

    if (maNv) {
      const { data } = await supabase
        .from("mdm_nhan_su")
        .select("id, ma_nv, ho_ten, auth_user_id, is_active, extra_data, khoa_id")
        .eq("ma_nv", maNv)
        .maybeSingle();
      if (data) existing = data as unknown as ExistingStaffRow;
    }

    if (!existing) {
      const { data: byEmail } = await supabase
        .from("v_mdm_nhan_su_full")
        .select("id, ma_nv, ho_ten, auth_user_id, is_active, extra_data, khoa_id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (byEmail) existing = byEmail as unknown as ExistingStaffRow;
    }

    if (existing?.auth_user_id) {
      return {
        success: false as const,
        error: "Email/mã NV này đã có tài khoản đăng nhập. Dùng «Quên mật khẩu» nếu cần.",
      };
    }

    if (existing && isPendingAccountRequest(existing.extra_data)) {
      return {
        success: false as const,
        error: "Đã có yêu cầu chờ duyệt cho hồ sơ này. Vui lòng chờ quản trị xử lý.",
      };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      ho_ten: hoTen,
      ma_nv: maNv || existing?.ma_nv || null,
      so_dien_thoai: sdt || null,
      khoa_id: khoaId,
      chuc_danh: chucDanh || null,
      ly_do: lyDo,
    };

    const ticketId = await insertAccessRequestRow(supabase, {
      kind: "REQUEST",
      email,
      staff_id: existing?.id ?? null,
      payload,
    });

    const requestMeta: AccountRequestMeta = {
      status: "CHO_DUYET",
      kind: "REQUEST",
      ly_do: lyDo,
      ...(chucDanh ? { chuc_danh: chucDanh } : {}),
      submitted_at: nowIso,
      ...(ticketId ? { ticket_id: ticketId } : {}),
    };

    if (existing) {
      const extra = mergeAccountRequest(
        {
          ...(existing.extra_data || {}),
          email,
          ...(sdt ? { so_dien_thoai: sdt } : {}),
        },
        requestMeta,
      );
      const patch: Record<string, unknown> = {
        extra_data: extra,
        updated_at: nowIso,
        ho_ten: hoTen || existing.ho_ten,
      };
      if (khoaId) patch.khoa_id = khoaId;
      if (existing.is_active !== true) {
        patch.is_active = false;
      }

      const { error: upErr } = await supabase.from("mdm_nhan_su").update(patch).eq("id", existing.id);
      if (upErr) throw upErr;

      revalidatePath("/quan-tri-he-thong/nhan-su");
      revalidatePath("/quan-tri-he-thong/tai-khoan");
      return {
        success: true as const,
        staffId: existing.id,
        linkedExisting: true,
        ticket_id: ticketId,
        ticket_code: formatAccountRequestTicketCode(ticketId),
      };
    }

    const newMa = maNv || genPendingMaNv();
    const { data: clash } = await supabase.from("mdm_nhan_su").select("id").eq("ma_nv", newMa).maybeSingle();
    const finalMa = clash ? genPendingMaNv() : newMa;

    const extra = mergeAccountRequest(
      {
        email,
        ...(sdt ? { so_dien_thoai: sdt } : {}),
      },
      requestMeta,
    );

    const { data: inserted, error: insErr } = await supabase
      .from("mdm_nhan_su")
      .insert({
        ho_ten: hoTen,
        ma_nv: finalMa,
        khoa_id: khoaId,
        is_active: false,
        extra_data: extra,
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    if (ticketId && inserted?.id) {
      try {
        await supabase
          .from("sys_account_access_request")
          .update({ staff_id: inserted.id })
          .eq("id", ticketId);
      } catch {
        /* best-effort link */
      }
    }

    revalidatePath("/quan-tri-he-thong/nhan-su");
    revalidatePath("/quan-tri-he-thong/tai-khoan");
    return {
      success: true as const,
      staffId: inserted.id as string,
      linkedExisting: false,
      ticket_id: ticketId,
      ticket_code: formatAccountRequestTicketCode(ticketId),
    };
  } catch (e: unknown) {
    console.error("[submitAccountAccessRequest]", e);
    return { success: false as const, error: errMsg(e) || "Không gửi được yêu cầu." };
  }
}

/**
 * Public: xin admin đặt lại MK (song song email self-service).
 * Gắn soft account_request kind=RESET trên hồ sơ đã có Auth; dual-write bảng phiếu nếu có.
 */
export async function submitForgotResetAdminRequestAction(input: {
  email: string;
  ma_nv?: string;
  ly_do: string;
}) {
  try {
    const email = normalizeEmail(String(input.email || ""));
    const maNv = String(input.ma_nv || "").trim();
    const lyDo = String(input.ly_do || "").trim();

    if (!email || !email.includes("@")) {
      return { success: false as const, error: "Email không hợp lệ." };
    }
    if (!lyDo || lyDo.length < 5) {
      return { success: false as const, error: "Lý do tối thiểu 5 ký tự." };
    }

    const coolErr = assertSubmitCooldown(`reset:${email}`);
    if (coolErr) return { success: false as const, error: coolErr };

    const supabase = createAdminSupabaseClient();

    type StaffRow = {
      id: string;
      ma_nv: string | null;
      auth_user_id: string | null;
      is_active: boolean | null;
      extra_data: Record<string, unknown> | null;
    };

    let staff: StaffRow | null = null;
    if (maNv) {
      const { data } = await supabase
        .from("mdm_nhan_su")
        .select("id, ma_nv, auth_user_id, is_active, extra_data")
        .eq("ma_nv", maNv)
        .maybeSingle();
      if (data) staff = data as unknown as StaffRow;
    }
    if (!staff) {
      const { data } = await supabase
        .from("v_mdm_nhan_su_full")
        .select("id, ma_nv, auth_user_id, is_active, extra_data")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (data) staff = data as unknown as StaffRow;
    }

    // Uniform response — không lộ chi tiết hồ sơ
    if (!staff?.auth_user_id) {
      return {
        success: true as const,
        message: "Nếu email tồn tại trong hệ thống, yêu cầu đã được ghi nhận để quản trị xử lý.",
      };
    }
    if (staff.is_active === false) {
      return {
        success: true as const,
        message: "Nếu email tồn tại trong hệ thống, yêu cầu đã được ghi nhận để quản trị xử lý.",
      };
    }

    if (isPendingAccountRequest(staff.extra_data)) {
      return {
        success: false as const,
        error: "Đã có yêu cầu chờ duyệt cho hồ sơ này. Vui lòng chờ quản trị xử lý hoặc tra cứu trạng thái.",
      };
    }

    const nowIso = new Date().toISOString();
    const ticketId = await insertAccessRequestRow(supabase, {
      kind: "RESET",
      email,
      staff_id: staff.id,
      payload: { ma_nv: maNv || staff.ma_nv, ly_do: lyDo, source: "FORGOT_RESET" },
    });

    const extra = mergeAccountRequest(
      { ...(staff.extra_data || {}), email },
      {
        status: "CHO_DUYET",
        kind: "RESET",
        ly_do: lyDo,
        submitted_at: nowIso,
        ...(ticketId ? { ticket_id: ticketId } : {}),
      },
    );

    const { error: upErr } = await supabase
      .from("mdm_nhan_su")
      .update({ extra_data: extra, updated_at: nowIso })
      .eq("id", staff.id);
    if (upErr) throw upErr;

    revalidatePath("/quan-tri-he-thong/nhan-su");
    revalidatePath("/quan-tri-he-thong/tai-khoan");
    return {
      success: true as const,
      message: "Nếu email tồn tại trong hệ thống, yêu cầu đã được ghi nhận để quản trị xử lý.",
    };
  } catch (e: unknown) {
    console.error("[submitForgotResetAdminRequest]", e);
    return { success: false as const, error: errMsg(e) || "Không gửi được yêu cầu." };
  }
}

/**
 * Public tra cứu trạng thái phiếu — chỉ status / kind / reject_reason (không dump hồ sơ).
 */
export async function lookupAccountAccessRequestStatusAction(input: {
  email: string;
  ma_nv?: string;
}) {
  try {
    const email = normalizeEmail(String(input.email || ""));
    const maNv = String(input.ma_nv || "").trim();
    if (!email || !email.includes("@")) {
      return { success: false as const, error: "Email không hợp lệ." };
    }

    const supabase = createAdminSupabaseClient();

    const fromTable = await lookupAccessRequestFromTable(supabase, email, maNv || undefined);
    if (fromTable) {
      return {
        success: true as const,
        found: true as const,
        status: fromTable.status,
        kind: fromTable.kind,
        reject_reason: fromTable.status === "TU_CHOI" ? fromTable.reject_reason : null,
        ticket_code: formatAccountRequestTicketCode(fromTable.ticket_id),
      };
    }

    // Soft fallback
    type SoftRow = { extra_data: Record<string, unknown> | null; ma_nv: string | null };
    let row: SoftRow | null = null;
    if (maNv) {
      const { data } = await supabase
        .from("mdm_nhan_su")
        .select("extra_data, ma_nv")
        .eq("ma_nv", maNv)
        .maybeSingle();
      if (data) row = data as SoftRow;
    }
    if (!row) {
      const { data } = await supabase
        .from("v_mdm_nhan_su_full")
        .select("extra_data, ma_nv")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (data) row = data as SoftRow;
    }

    const req = readAccountRequest(row?.extra_data);
    if (!req) {
      return { success: true as const, found: false as const };
    }

    return {
      success: true as const,
      found: true as const,
      status: req.status,
      kind: req.kind || ("REQUEST" as const),
      reject_reason: req.status === "TU_CHOI" ? req.reject_reason || null : null,
      ticket_code: formatAccountRequestTicketCode(req.ticket_id),
    };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

/** Admin: số phiếu chờ duyệt (hub Tài khoản). Soft count nếu chưa có bảng. */
export async function countPendingAccountRequestsAction() {
  try {
    // Hub Tài khoản requires PHAN_QUYEN edit / ADMIN — same gate as provision.
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    const fromTable = await countPendingAccessRequests(supabase);
    if (fromTable != null) {
      return { success: true as const, count: fromTable };
    }
    const { count, error } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("id", { count: "exact", head: true })
      .contains("extra_data", { account_request: { status: "CHO_DUYET" } });
    if (error) throw error;
    return { success: true as const, count: count ?? 0 };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e), count: 0 };
  }
}

/** Admin: danh sách hồ sơ đang chờ duyệt TK / RESET. */
export async function listPendingAccountRequests(params?: { page?: number; pageSize?: number }) {
  try {
    await verifyPermission("NHAN_SU", "view");
    const supabase = createAdminSupabaseClient();
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from("v_mdm_nhan_su_full")
      .select(
        "id, ma_nv, ho_ten, email, so_dien_thoai, khoa_id, ten_khoa, auth_user_id, is_active, extra_data, created_at",
        { count: "exact" },
      )
      .contains("extra_data", { account_request: { status: "CHO_DUYET" } })
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
    const reauth = await verifyCurrentActorPassword(params.confirmActorPassword);
    if (!reauth.ok) return { success: false as const, error: reauth.error };

    const supabase = createAdminSupabaseClient();
    const pw = params.password;
    if (!pw || pw.length < 8) {
      return { success: false as const, error: "Mật khẩu tối thiểu 8 ký tự." };
    }

    const { data: staff, error: sErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, extra_data, is_active, auth_user_id")
      .eq("id", params.staffId)
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

    revalidatePath("/quan-tri-he-thong/nhan-su");
    revalidatePath("/quan-tri-he-thong/tai-khoan");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

/**
 * Admin duyệt RESET: chỉ đánh dấu DUYET trên phiếu — caller đã/ sẽ gọi adminResetStaffPasswordAction.
 * Hoặc gộp: truyền password + confirmActorPassword để reset luôn.
 */
export async function approveForgotResetRequest(params: {
  staffId: string;
  password: string;
  confirmActorPassword: string;
  secondApproverEmail?: string;
}) {
  try {
    const { adminResetStaffPasswordAction } = await import(
      "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/actions/tai-khoan-nhan-su.actions"
    );
    const reset = await adminResetStaffPasswordAction({
      staffId: params.staffId,
      password: params.password,
      confirmActorPassword: params.confirmActorPassword,
      secondApproverEmail: params.secondApproverEmail,
    });
    if (!reset.success) return reset;

    const actor = await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    const { data: staff } = await supabase
      .from("mdm_nhan_su")
      .select("id, extra_data")
      .eq("id", params.staffId)
      .maybeSingle();
    const req = readAccountRequest(staff?.extra_data as Record<string, unknown> | null);
    if (req && req.status === "CHO_DUYET" && (req.kind || "REQUEST") === "RESET") {
      const extra = mergeAccountRequest(staff?.extra_data as Record<string, unknown> | null, {
        ...req,
        status: "DUYET",
        approved_at: new Date().toISOString(),
        approved_by: actor.email ?? actor.id,
      });
      await supabase
        .from("mdm_nhan_su")
        .update({ extra_data: extra, updated_at: new Date().toISOString() })
        .eq("id", params.staffId);
      await decideAccessRequestRow(supabase, {
        ticketId: req.ticket_id,
        staffId: params.staffId,
        status: "DUYET",
        decidedBy: actor.email ?? actor.id,
      });
    }

    revalidatePath("/quan-tri-he-thong/nhan-su");
    revalidatePath("/quan-tri-he-thong/tai-khoan");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}

/** Admin từ chối: status TU_CHOI + lý do trong extra_data (+ bảng phiếu nếu có). */
export async function rejectAccountAccessRequest(params: { staffId: string; reason: string }) {
  try {
    const actor = await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    const reason = String(params.reason || "").trim();
    if (reason.length < 3) {
      return { success: false as const, error: "Lý do từ chối tối thiểu 3 ký tự." };
    }

    const { data: staff, error: sErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, extra_data, is_active, auth_user_id")
      .eq("id", params.staffId)
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

    revalidatePath("/quan-tri-he-thong/nhan-su");
    revalidatePath("/quan-tri-he-thong/tai-khoan");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
}
