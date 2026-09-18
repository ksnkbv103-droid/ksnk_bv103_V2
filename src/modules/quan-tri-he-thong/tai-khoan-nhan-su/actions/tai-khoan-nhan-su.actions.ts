"use server";

import { revalidatePath } from "next/cache";
import { invalidateUserPermissionsCache } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";

import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { ensureStaffAuthEmailMatchesProfile } from "@/lib/auth/staff-auth-email";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";

import type { StaffAuthRow } from "@/types/nhan-su";
import {
  GUEST_STATS_PILOT_EMAIL,
  GUEST_STATS_PILOT_HO_TEN,
  GUEST_STATS_PILOT_MA_NV,
  GUEST_STATS_ROLE_NAME,
} from "@/lib/auth/guest-stats-pilot";
import {
  RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER,
  selectRolesForStaffKsnkAssignment,
} from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";
import { verifyCurrentActorPassword } from "../lib/admin-reauth";

function err(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}


const AUTH_AUDIT_MAX = 40;

type AuthAuditAction = "provision" | "admin_reset" | "self_change" | "reject_request";

type AuthAuditEntry = {
  actor_id: string | null;
  actor_email: string | null;
  action: AuthAuditAction;
  staff_id: string;
  ts: string;
  second_actor_email?: string | null;
  confirm_mode?: string | null;
};

/** Append lean auth event onto mdm_nhan_su.extra_data.auth_audit (capped). */
async function appendStaffAuthAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  staffId: string,
  entry: Omit<AuthAuditEntry, "staff_id" | "ts"> & { staff_id?: string },
) {
  try {
    const { data: row } = await supabase
      .from("mdm_nhan_su")
      .select("extra_data")
      .eq("id", staffId)
      .maybeSingle();
    const extra =
      row?.extra_data && typeof row.extra_data === "object" && !Array.isArray(row.extra_data)
        ? { ...(row.extra_data as Record<string, unknown>) }
        : {};
    const prev = Array.isArray(extra.auth_audit) ? (extra.auth_audit as AuthAuditEntry[]) : [];
    const nextEntry: AuthAuditEntry = {
      actor_id: entry.actor_id ?? null,
      actor_email: entry.actor_email ?? null,
      action: entry.action,
      staff_id: entry.staff_id ?? staffId,
      ts: new Date().toISOString(),
      ...(entry.second_actor_email != null
        ? { second_actor_email: entry.second_actor_email }
        : {}),
      ...(entry.confirm_mode != null ? { confirm_mode: entry.confirm_mode } : {}),
    };
    extra.auth_audit = [...prev, nextEntry].slice(-AUTH_AUDIT_MAX);
    await supabase.from("mdm_nhan_su").update({ extra_data: extra }).eq("id", staffId);
  } catch (e) {
    console.error("[auth_audit] append failed:", e);
  }
}



/** Danh sách nhân sự + trạng thái liên kết Auth + vai trò RBAC (chỉ quản trị). */
export async function listStaffAuthOverview(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    const { search, page = 1, pageSize = 50 } = params;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let q = supabase.from("v_sys_staff_auth_overview").select("*", { count: "exact" });
    
    const searchFilter = buildSupabaseSearchFilter(search, ["ho_ten", "ma_nv", "email"]);
    if (searchFilter) {
      q = q.or(searchFilter);
    }

    const { data, error, count } = await q
      .order("is_active", { ascending: false })
      .order("ma_nv", { ascending: true })
      .range(start, end);

    if (error) throw error;

    return {
      success: true as const,
      rows: (data || []) as StaffAuthRow[],
      total: count ?? 0,
      page,
      pageSize,
    };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}

/** Lấy toàn bộ danh sách vai trò hiện có trong DB để gán cho tài khoản. */
export async function getAvailableRolesAction() {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("sys_roles")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    const rows = selectRolesForStaffKsnkAssignment(data || []);
    return { success: true as const, data: rows };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}


/** Gán đúng một vai trò KSNK hệ thống (xoá các vai trò KSNK khác của user). */
export async function setStaffKsnkRbacRole(params: {
  staffId: string;
  roleName: string;
}) {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    const roleNorm = params.roleName.trim();

    const roleUpper = roleNorm.toUpperCase();
    const canonicalName =
      RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER.find((x) => x === roleUpper) ?? null;
    if (!canonicalName) {
      return {
        success: false as const,
        error:
          "Chỉ được gán một trong: Hội đồng KSNK, Nhân viên khoa KSNK, Mạng lưới KSNK, hoặc Khách xem Thống kê.",
      };
    }

    // Kiểm tra role tồn tại và còn active trong DB
    const { data: roleExists } = await supabase
      .from("sys_roles")
      .select("id")
      .eq("name", canonicalName)
      .eq("is_active", true)
      .maybeSingle();

    if (!roleExists) {
      return { success: false as const, error: "Vai trò không hợp lệ hoặc đã ngưng hoạt động." };
    }

    // Sử dụng RPC nguyên tử để tránh lỗi mất quyền khi thực hiện nhiều bước
    const { data, error } = await supabase.rpc("rpc_assign_staff_ksnk_role", {
      p_staff_id: params.staffId,
      p_role_name: canonicalName,
    });

    if (error) throw error;
    if (!data?.success) return { success: false as const, error: data?.error || "Lỗi khi gán quyền." };

    await invalidateUserPermissionsCache();
    revalidatePath("/quan-tri-he-thong/tai-khoan");
    revalidatePath("/quan-tri-he-thong/nhan-su");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}


/**
 * Tạo tài khoản Supabase Auth + liên kết auth_user_id.
 * Mật khẩu ban đầu do quản trị đặt; người dùng nên đổi sau đăng nhập.
 */
export async function provisionStaffAuthAccount(params: {
  staffId: string;
  password: string;
}) {
  try {
    const actor = await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    const pw = params.password;
    if (!pw || pw.length < 8) {
      return { success: false as const, error: "Mật khẩu tối thiểu 8 ký tự." };
    }

    const { data: staff, error: sErr } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("id, email, ma_nv, auth_user_id, is_active, extra_data")
      .eq("id", params.staffId)
      .maybeSingle();

    if (sErr || !staff) return { success: false as const, error: "Không tìm thấy nhân viên." };
    if (staff.is_active === false) {
      return { success: false as const, error: "Nhân viên không còn hoạt động." };
    }
    if (staff.auth_user_id) {
      return { success: false as const, error: "Đã có tài khoản đăng nhập." };
    }

    const email = normalizeEmail(String(staff.email || ""));
    if (!email) return { success: false as const, error: "Thiếu email trên hồ sơ nhân sự." };

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: pw,
      email_confirm: true,
      user_metadata: { ma_nv: staff.ma_nv, must_change_password: true },
    });

    if (createErr || !created.user?.id) {
      return { success: false as const, error: createErr?.message || "Không tạo được tài khoản." };
    }

    const existingExtraData = (staff as any).extra_data || {};
    const updatedExtraData = { ...existingExtraData, email };

    const { error: upErr } = await supabase
      .from("mdm_nhan_su")
      .update({ auth_user_id: created.user.id, extra_data: updatedExtraData })
      .eq("id", staff.id);
    if (upErr) {
      // Rollback best-effort để tránh orphan auth user khi link staff thất bại.
      await supabase.auth.admin.deleteUser(created.user.id);
      throw upErr;
    }

    await appendStaffAuthAudit(supabase, staff.id, {
      actor_id: actor.id,
      actor_email: actor.email ?? null,
      action: "provision",
    });

    revalidatePath("/quan-tri-he-thong/tai-khoan");
    revalidatePath("/quan-tri-he-thong/nhan-su");
    return { success: true as const, userId: created.user.id };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}

/**
 * Admin thay đổi/đặt lại mật khẩu đăng nhập cho nhân viên.
 * Bắt buộc re-auth mật khẩu admin hiện tại. Không khuyến nghị tự reset TK của chính mình
 * (nên dùng Đổi mật khẩu); nếu vẫn làm thì ghi nhận email quản trị khác — chưa có duyệt 2 admin live.
 */
export async function adminResetStaffPasswordAction(params: {
  staffId: string;
  password: string;
  confirmActorPassword: string;
  /** Email quản trị khác — bắt buộc khi reset chính tài khoản đang đăng nhập (ghi nhận, không phải dual-control live). */
  secondApproverEmail?: string;
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
      .from("v_mdm_nhan_su_full")
      .select("id, auth_user_id, email, is_active")
      .eq("id", params.staffId)
      .maybeSingle();

    if (sErr || !staff) return { success: false as const, error: "Không tìm thấy nhân viên." };
    if (staff.is_active === false) {
      return { success: false as const, error: "Hồ sơ nhân sự không còn hoạt động — không đặt lại mật khẩu." };
    }
    if (!staff.auth_user_id) {
      return { success: false as const, error: "Nhân viên chưa có tài khoản hệ thống." };
    }

    const isSelf = staff.auth_user_id === actor.id;
    const secondEmail = normalizeEmail(String(params.secondApproverEmail || ""));
    if (isSelf) {
      if (!secondEmail || !secondEmail.includes("@")) {
        return {
          success: false as const,
          error: "Không khuyến nghị tự đặt lại MK của chính mình — dùng Đổi mật khẩu, hoặc nhập email quản trị khác để ghi nhận.",
        };
      }
      if (secondEmail === normalizeEmail(actor.email || "")) {
        return {
          success: false as const,
          error: "Email quản trị khác phải khác tài khoản đang đăng nhập.",
        };
      }
    }

    const emailSync = await ensureStaffAuthEmailMatchesProfile(
      supabase,
      staff.auth_user_id,
      staff.email,
    );
    if (!emailSync.ok) {
      return { success: false as const, error: emailSync.error };
    }

    const { data: got } = await supabase.auth.admin.getUserById(staff.auth_user_id);
    const prevMeta =
      got?.user?.user_metadata && typeof got.user.user_metadata === "object"
        ? { ...(got.user.user_metadata as Record<string, unknown>) }
        : {};

    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      staff.auth_user_id,
      {
        password: pw,
        email_confirm: true,
        user_metadata: { ...prevMeta, must_change_password: true },
      },
    );

    if (updateErr) throw updateErr;

    await appendStaffAuthAudit(supabase, staff.id, {
      actor_id: actor.id,
      actor_email: actor.email ?? null,
      action: "admin_reset",
      second_actor_email: secondEmail || null,
      confirm_mode: isSelf ? "reauth+second_email" : "reauth",
    });

    revalidatePath("/quan-tri-he-thong/tai-khoan");
    revalidatePath("/quan-tri-he-thong/nhan-su");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}

export type GuestStatsPilotStatus = {
  ma_nv: string;
  email: string | null;
  hasStaff: boolean;
  hasAuth: boolean;
  hasGuestRole: boolean;
  staffId: string | null;
};

/** Trạng thái tài khoản khách pilot (mã KHACH01) — cho admin thiết lập trên Vercel. */
export async function getGuestStatsPilotStatusAction() {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    const { data: staff, error } = await supabase
      .from("v_sys_staff_auth_overview")
      .select("id, email, auth_user_id, role_names")
      .eq("ma_nv", GUEST_STATS_PILOT_MA_NV)
      .maybeSingle();

    if (error) throw error;

    const roleNames = (staff?.role_names as string[] | null) ?? [];
    const hasGuestRole = roleNames
      .map((r) => String(r || "").trim().toUpperCase())
      .includes(GUEST_STATS_ROLE_NAME);

    return {
      success: true as const,
      status: {
        ma_nv: GUEST_STATS_PILOT_MA_NV,
        email: staff?.email ? String(staff.email) : null,
        hasStaff: Boolean(staff?.id),
        hasAuth: Boolean(staff?.auth_user_id),
        hasGuestRole,
        staffId: staff?.id ?? null,
      } satisfies GuestStatsPilotStatus,
    };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}

/**
 * Thiết lập / cập nhật tài khoản khách xem Thống kê trên môi trường cloud (Vercel).
 * Tạo hồ sơ KHACH01 nếu thiếu, Auth user, gán vai trò KHACH_THONG_KE_GSTT.
 */
export async function setupGuestStatsPilotAccountAction(params: {
  password: string;
  email?: string;
}) {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    const pw = params.password;
    if (!pw || pw.length < 8) {
      return { success: false as const, error: "Mật khẩu tối thiểu 8 ký tự." };
    }

    const email = normalizeEmail(params.email?.trim() || GUEST_STATS_PILOT_EMAIL);

    const { data: guestRole } = await supabase
      .from("sys_roles")
      .select("id")
      .eq("name", GUEST_STATS_ROLE_NAME)
      .maybeSingle();
    if (!guestRole) {
      return {
        success: false as const,
        error: "Chưa có vai trò Khách trong DB. Vào Phân quyền → Đồng bộ Registry rồi thử lại.",
      };
    }

    const { data: existingStaff, error: staffLookupErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, auth_user_id, extra_data, is_active")
      .eq("ma_nv", GUEST_STATS_PILOT_MA_NV)
      .maybeSingle();
    if (staffLookupErr) throw staffLookupErr;

    let staffId: string;

    if (existingStaff?.id) {
      staffId = existingStaff.id;
      const extra = {
        ...((existingStaff.extra_data as Record<string, unknown> | null) ?? {}),
        email,
      };
      const patch: Record<string, unknown> = { extra_data: extra, updated_at: new Date().toISOString() };
      if (existingStaff.is_active === false) patch.is_active = true;
      const { error: upStaffErr } = await supabase.from("mdm_nhan_su").update(patch).eq("id", staffId);
      if (upStaffErr) throw upStaffErr;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("mdm_nhan_su")
        .insert({
          ho_ten: GUEST_STATS_PILOT_HO_TEN,
          ma_nv: GUEST_STATS_PILOT_MA_NV,
          khoa_id: null,
          is_active: true,
          extra_data: { email },
        })
        .select("id")
        .single();
      if (insErr || !inserted?.id) {
        return { success: false as const, error: insErr?.message || "Không tạo được hồ sơ khách." };
      }
      staffId = inserted.id;
    }

    const { data: staffAuthRow, error: staffAuthErr } = await supabase
      .from("mdm_nhan_su")
      .select("auth_user_id")
      .eq("id", staffId)
      .single();
    if (staffAuthErr) throw staffAuthErr;

    let authUserId = staffAuthRow?.auth_user_id as string | null;

    if (!authUserId) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: pw,
        email_confirm: true,
        user_metadata: { ma_nv: GUEST_STATS_PILOT_MA_NV, full_name: GUEST_STATS_PILOT_HO_TEN },
      });

      if (createErr?.message?.toLowerCase().includes("already") || createErr?.status === 422) {
        const { data: listed, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
        if (listErr) throw listErr;
        const found = listed.users.find((u) => normalizeEmail(u.email || "") === email);
        if (!found?.id) {
          return {
            success: false as const,
            error: "Email đã tồn tại nhưng không tra được user Auth. Liên hệ kỹ thuật.",
          };
        }
        authUserId = found.id;
      } else if (createErr || !created.user?.id) {
        return { success: false as const, error: createErr?.message || "Không tạo được tài khoản Auth." };
      } else {
        authUserId = created.user.id;
      }

      const { data: otherStaff } = await supabase
        .from("mdm_nhan_su")
        .select("id")
        .eq("auth_user_id", authUserId)
        .neq("id", staffId)
        .maybeSingle();
      if (otherStaff?.id) {
        return { success: false as const, error: "Email đã liên kết với nhân sự khác." };
      }

      const { error: linkErr } = await supabase
        .from("mdm_nhan_su")
        .update({ auth_user_id: authUserId, extra_data: { email } })
        .eq("id", staffId);
      if (linkErr) throw linkErr;

      await supabase.auth.admin.updateUserById(authUserId, { password: pw, email_confirm: true });
    } else {
      const emailSync = await ensureStaffAuthEmailMatchesProfile(supabase, authUserId, email);
      if (!emailSync.ok) {
        return { success: false as const, error: emailSync.error };
      }
      const { error: pwErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password: pw,
        email_confirm: true,
      });
      if (pwErr) throw pwErr;
    }

    const { data: rpcData, error: rpcErr } = await supabase.rpc("rpc_assign_staff_ksnk_role", {
      p_staff_id: staffId,
      p_role_name: GUEST_STATS_ROLE_NAME,
    });
    if (rpcErr) throw rpcErr;
    if (!rpcData?.success) {
      return { success: false as const, error: rpcData?.error || "Không gán được vai trò Khách." };
    }

    await invalidateUserPermissionsCache();
    revalidatePath("/quan-tri-he-thong/tai-khoan");
    revalidatePath("/quan-tri-he-thong/nhan-su");
    return { success: true as const, email, staffId };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}

