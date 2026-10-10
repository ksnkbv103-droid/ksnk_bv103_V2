"use server";

/** Public (chưa đăng nhập): xin cấp tài khoản, quên mật khẩu, tra cứu. Admin ở `account-access-request.actions.ts`. */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import { isPendingAccountRequest, mergeAccountRequest, type AccountRequestMeta } from "../lib/account-access-request";
import { discardAccessRequestRow, hasRecentAccessRequest, insertAccessRequestRow } from "../lib/account-access-request-store";
import { parseOrFirstError } from "@/lib/validations/tai-khoan-nhan-su.validations";
import { lookupAccountAccessRequestStatusSchema, submitAccountAccessRequestSchema, submitForgotResetAdminRequestSchema } from "@/lib/validations/account-access-request.validations";
import { revalidateNhanSuTaiKhoan } from "@/modules/quan-tri-he-thong/actions/revalidate-quan-tri";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

const SUBMIT_COOLDOWN_MS = 45_000;

/** Cùng một câu cho đã có tài khoản, đang chờ, vừa gửi, hoặc tra cứu. */
const PUBLIC_ACCOUNT_ACK =
  "Nếu thông tin hợp lệ, yêu cầu đã được ghi nhận. Quản trị sẽ xử lý khi cần.";

function publicAccountAck() {
  return { success: true as const, message: PUBLIC_ACCOUNT_ACK };
}

function genPendingMaNv(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YCTK-${stamp}-${rnd}`;
}


/** Public: chức danh active cho form xin cấp TK (id + tên — khớp admin). */
export async function listPublicChucDanhOptionsForAccountRequestAction() {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_chuc_danh")
      .select("id, ten_chuc_danh, ma_chuc_danh")
      .eq("is_active", true)
      .order("ten_chuc_danh", { ascending: true });
    if (error) throw error;
    return {
      success: true as const,
      data: (data || []).map((r) => ({
        id: String(r.id),
        ten_chuc_danh: String(r.ten_chuc_danh || ""),
        ma_chuc_danh: String(r.ma_chuc_danh || ""),
      })),
    };
  } catch (e: unknown) {
    return { success: false as const, error: errMsg(e) };
  }
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
  /** Bắt buộc — danh mục khoa. */
  khoa_id: string;
  /** Bắt buộc — danh mục chức danh (không chữ tự do). */
  chuc_danh_id: string;
  ma_nv?: string;
  so_dien_thoai?: string;
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
    const parsed = parseOrFirstError(submitAccountAccessRequestSchema, input);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const hoTen = parsed.data.ho_ten;
    const email = normalizeEmail(parsed.data.email);
    const maNv = parsed.data.ma_nv || "";
    const sdt = parsed.data.so_dien_thoai || "";
    const khoaId = parsed.data.khoa_id;
    const chucDanhId = parsed.data.chuc_danh_id;
    const lyDo = parsed.data.ly_do;

    if (!email || !email.includes("@")) {
      return { success: false as const, error: "Email không hợp lệ." };
    }

    const supabase = createAdminSupabaseClient();
    if (await hasRecentAccessRequest(supabase, email, SUBMIT_COOLDOWN_MS)) {
      return publicAccountAck();
    }

    const khoas = await getCachedDmKhoaPhong();
    if (!(khoas || []).some((k) => String(k.id) === khoaId)) {
      return { success: false as const, error: "Khoa / phòng không hợp lệ — chọn lại từ danh sách." };
    }

    const { data: cdRow, error: cdErr } = await supabase
      .from("mdm_dm_chuc_danh")
      .select("id, ten_chuc_danh, is_active")
      .eq("id", chucDanhId)
      .maybeSingle();
    if (cdErr) throw cdErr;
    if (!cdRow?.id || cdRow.is_active === false) {
      return { success: false as const, error: "Chức danh không hợp lệ — chọn lại từ danh mục." };
    }
    const chucDanhTen = String(cdRow.ten_chuc_danh || "").trim();

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

    if (existing?.auth_user_id || (existing && isPendingAccountRequest(existing.extra_data))) {
      return publicAccountAck();
    }

    const nowIso = new Date().toISOString();
    const payload = {
      ho_ten: hoTen,
      ma_nv: maNv || existing?.ma_nv || null,
      so_dien_thoai: sdt || null,
      khoa_id: khoaId,
      chuc_danh_id: chucDanhId,
      chuc_danh: chucDanhTen || null,
      ly_do: lyDo,
    };

    const ticketId = await insertAccessRequestRow(supabase, {
      kind: "REQUEST",
      email,
      staff_id: existing?.id ?? null,
      payload,
    });

    try {
    const requestMeta: AccountRequestMeta = {
      status: "CHO_DUYET",
      kind: "REQUEST",
      ly_do: lyDo,
      chuc_danh_id: chucDanhId,
      ...(chucDanhTen ? { chuc_danh: chucDanhTen } : {}),
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
        khoa_id: khoaId,
        chuc_danh_id: chucDanhId,
      };
      if (existing.is_active !== true) {
        patch.is_active = false;
      }

      const { error: upErr } = await supabase.from("mdm_nhan_su").update(patch).eq("id", existing.id);
      if (upErr) throw upErr;

      revalidateNhanSuTaiKhoan();
      return publicAccountAck();
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
        chuc_danh_id: chucDanhId,
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

    revalidateNhanSuTaiKhoan();
    return publicAccountAck();
    } catch (writeErr) {
      await discardAccessRequestRow(supabase, ticketId);
      throw writeErr;
    }
  } catch (e: unknown) {
    console.error("[submitAccountAccessRequest]", e);
    return { success: false as const, error: "Không gửi được yêu cầu." };
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
    const parsed = parseOrFirstError(submitForgotResetAdminRequestSchema, input);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const email = normalizeEmail(parsed.data.email);
    const maNv = parsed.data.ma_nv || "";
    const lyDo = parsed.data.ly_do;

    if (!email || !email.includes("@")) {
      return { success: false as const, error: "Email không hợp lệ." };
    }

    const supabase = createAdminSupabaseClient();
    if (await hasRecentAccessRequest(supabase, email, SUBMIT_COOLDOWN_MS)) {
      return publicAccountAck();
    }

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
    if (!staff?.auth_user_id || staff.is_active === false || isPendingAccountRequest(staff.extra_data)) {
      return publicAccountAck();
    }

    const nowIso = new Date().toISOString();
    const ticketId = await insertAccessRequestRow(supabase, {
      kind: "RESET",
      email,
      staff_id: staff.id,
      payload: { ma_nv: maNv || staff.ma_nv, ly_do: lyDo, source: "FORGOT_RESET" },
    });

    try {
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

    revalidateNhanSuTaiKhoan();
    return publicAccountAck();
    } catch (writeErr) {
      await discardAccessRequestRow(supabase, ticketId);
      throw writeErr;
    }
  } catch (e: unknown) {
    console.error("[submitForgotResetAdminRequest]", e);
    return { success: false as const, error: "Không gửi được yêu cầu." };
  }
}

/**
 * Public tra cứu — không trả found/status (không phân biệt có phiếu hay không).
 */
export async function lookupAccountAccessRequestStatusAction(input: {
  email: string;
  ma_nv?: string;
}) {
  const parsed = parseOrFirstError(lookupAccountAccessRequestStatusSchema, input);
  if (!parsed.ok) return { success: false as const, error: parsed.error };
  const email = normalizeEmail(parsed.data.email);
  if (!email || !email.includes("@")) {
    return { success: false as const, error: "Email không hợp lệ." };
  }
  return publicAccountAck();
}
