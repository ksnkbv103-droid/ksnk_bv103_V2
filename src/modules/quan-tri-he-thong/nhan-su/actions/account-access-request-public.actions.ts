"use server";

/** Public (chưa đăng nhập): xin cấp tài khoản, quên mật khẩu, tra cứu. Admin ở `account-access-request.actions.ts`. */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import {
  ACCESS_REQUEST_COOLDOWN_MS,
  ACCESS_REQUEST_MA_NV_WINDOW_MS,
  accountEmailsMatch,
  canCreateResetTicket,
  isAccessRequestThrottled,
} from "../lib/account-access-request";
import { countAccessRequests, insertAccessRequestRow } from "../lib/account-access-request-store";
import { parseOrFirstError } from "@/lib/validations/tai-khoan-nhan-su.validations";
import { lookupAccountAccessRequestStatusSchema, submitAccountAccessRequestSchema, submitForgotResetAdminRequestSchema } from "@/lib/validations/account-access-request.validations";
import { revalidateNhanSuTaiKhoan } from "@/modules/quan-tri-he-thong/actions/revalidate-quan-tri";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Cùng một câu cho đã có tài khoản, đang chờ, vừa gửi, hoặc tra cứu. */
const PUBLIC_ACCOUNT_ACK =
  "Nếu thông tin hợp lệ, yêu cầu đã được ghi nhận. Quản trị sẽ xử lý khi cần.";

function publicAccountAck() {
  return { success: true as const, message: PUBLIC_ACCOUNT_ACK };
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

/** ACC-1: chặn gửi dồn theo email, mã NV và số phiếu chờ còn mở — không captcha (PO quyết). */
async function isPublicRequestThrottled(supabase: unknown, email: string, maNv: string): Promise<boolean> {
  const [recentByEmail, recentByMaNv, pendingByEmail, pendingByMaNv] = await Promise.all([
    countAccessRequests(supabase, { email, sinceMs: ACCESS_REQUEST_COOLDOWN_MS }),
    maNv ? countAccessRequests(supabase, { maNv, sinceMs: ACCESS_REQUEST_MA_NV_WINDOW_MS }) : 0,
    countAccessRequests(supabase, { email, pendingOnly: true }),
    maNv ? countAccessRequests(supabase, { maNv, pendingOnly: true }) : 0,
  ]);
  return isAccessRequestThrottled({ recentByEmail, recentByMaNv, pendingByEmail, pendingByMaNv });
}

type PublicStaffRow = {
  id: string;
  ma_nv: string | null;
  auth_user_id: string | null;
  is_active: boolean | null;
  email: string | null;
};

/** Chỉ đọc: hồ sơ theo mã NV, nếu không có thì theo email khớp chính xác (không ghi gì). */
async function findStaffForPublicRequest(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
  maNv: string,
): Promise<PublicStaffRow | null> {
  const cols = "id, ma_nv, auth_user_id, is_active, email";
  if (maNv) {
    const { data } = await supabase.from("v_mdm_nhan_su_full").select(cols).eq("ma_nv", maNv).maybeSingle();
    return (data as PublicStaffRow | null) ?? null;
  }
  const { data } = await supabase.from("v_mdm_nhan_su_full").select(cols).ilike("email", email).limit(5);
  const rows = (data || []) as PublicStaffRow[];
  return rows.find((r) => accountEmailsMatch(r.email, email)) ?? null;
}

/**
 * Public (chưa đăng nhập): chỉ ghi phiếu `sys_account_access_request` (kind=REQUEST, payload = đề xuất).
 * ACC-1: KHÔNG tạo/sửa `mdm_nhan_su` — hồ sơ chỉ tạo/sửa khi ADMIN duyệt phiếu. Không tạo Auth user.
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
    if (await isPublicRequestThrottled(supabase, email, maNv)) {
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

    const existing = await findStaffForPublicRequest(supabase, email, maNv);
    if (existing?.auth_user_id) return publicAccountAck();

    await insertAccessRequestRow(supabase, {
      kind: "REQUEST",
      email,
      // Chỉ là gợi ý cho admin; duyệt sẽ đối chiếu email hồ sơ trước khi đụng hồ sơ.
      staff_id: existing?.id ?? null,
      payload: {
        ho_ten: hoTen,
        ma_nv: maNv || existing?.ma_nv || null,
        so_dien_thoai: sdt || null,
        khoa_id: khoaId,
        chuc_danh_id: chucDanhId,
        chuc_danh: chucDanhTen || null,
        ly_do: lyDo,
        source: "PUBLIC_REQUEST",
      },
    });
    revalidateNhanSuTaiKhoan();
    return publicAccountAck();
  } catch (e: unknown) {
    console.error("[submitAccountAccessRequest]", { module: "nhan-su", action: "submitAccountAccessRequest", error: errMsg(e) });
    return { success: false as const, error: "Không gửi được yêu cầu." };
  }
}

/**
 * Public: xin admin đặt lại MK. ACC-1: chỉ tạo phiếu RESET khi email nhập khớp email hồ sơ;
 * luôn trả cùng một thông điệp; KHÔNG ghi hồ sơ / không đổi email.
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
    if (await isPublicRequestThrottled(supabase, email, maNv)) {
      return publicAccountAck();
    }

    const staff = await findStaffForPublicRequest(supabase, email, maNv);
    // Uniform response — không lộ hồ sơ có tồn tại / email có khớp hay không.
    if (!staff || !canCreateResetTicket(staff, email)) return publicAccountAck();
    if ((await countAccessRequests(supabase, { staffId: staff.id, pendingOnly: true })) > 0) {
      return publicAccountAck();
    }

    await insertAccessRequestRow(supabase, {
      kind: "RESET",
      email,
      staff_id: staff.id,
      payload: { ma_nv: staff.ma_nv || maNv || null, ly_do: lyDo, source: "FORGOT_RESET" },
    });
    revalidateNhanSuTaiKhoan();
    return publicAccountAck();
  } catch (e: unknown) {
    console.error("[submitForgotResetAdminRequest]", { module: "nhan-su", action: "submitForgotResetAdminRequest", error: errMsg(e) });
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
