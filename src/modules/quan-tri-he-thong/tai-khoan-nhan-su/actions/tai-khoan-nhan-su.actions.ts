"use server";

import { invalidateUserPermissionsCache } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/admin-audit";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { ensureStaffAuthEmailMatchesProfile } from "@/lib/auth/staff-auth-email";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import type { StaffAuthRow } from "@/types/nhan-su";
import { RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER, resolveAssignableRoleName, selectRolesForStaffKsnkAssignment } from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";
import { verifyCurrentActorPassword } from "../lib/admin-reauth";
import { adminResetStaffPasswordSchema, parseOrFirstError, provisionStaffAuthAccountSchema, setStaffKsnkRbacRoleSchema } from "@/lib/validations/tai-khoan-nhan-su.validations";
import { revalidateNhanSuTaiKhoan } from "@/modules/quan-tri-he-thong/actions/revalidate-quan-tri";

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

/** Gán đúng một vai trò KSNK hệ thống (xoá các vai trò KSNK khác của user). `roleName` rỗng = gỡ hết vai trò KSNK (cần migrate clear). */
export async function setStaffKsnkRbacRole(params: {
  staffId: string;
  roleName: string;
  confirmActorPassword?: string;
}) {
  try {
    const actor = await ensureRbacAdmin();
    const parsed = parseOrFirstError(setStaffKsnkRbacRoleSchema, params);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const input = parsed.data;
    const reauth = await verifyCurrentActorPassword(String(input.confirmActorPassword || ""));
    if (!reauth.ok) return { success: false as const, error: reauth.error };

    const supabase = createAdminSupabaseClient();

    const roleNorm = input.roleName;
    const roleUpper = roleNorm.toUpperCase();
    const canonicalName = roleNorm
      ? RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER.find((x) => x === roleUpper) ?? null
      : "";

    if (roleNorm && !canonicalName) {
      return {
        success: false as const,
        error:
          "Chỉ được gán một trong: Hội đồng KSNK, Nhân viên khoa KSNK, Mạng lưới KSNK, hoặc Khách xem Thống kê.",
      };
    }

    const { data: staffRow } = await supabase
      .from("mdm_nhan_su")
      .select("auth_user_id")
      .eq("id", input.staffId)
      .maybeSingle();
    if (staffRow?.auth_user_id && String(staffRow.auth_user_id) === String(actor.id)) {
      return {
        success: false as const,
        error: "Không được tự gán/gỡ vai trò của chính mình.",
      };
    }

    if (canonicalName) {
      const { data: roleExists } = await supabase
        .from("sys_roles")
        .select("id")
        .eq("name", canonicalName)
        .eq("is_active", true)
        .maybeSingle();

      if (!roleExists) {
        return { success: false as const, error: "Vai trò không hợp lệ hoặc đã ngưng hoạt động." };
      }
    }

    const { data, error } = await supabase.rpc("rpc_assign_staff_ksnk_role", {
      p_staff_id: input.staffId,
      p_role_name: canonicalName || "",
    });

    if (error) throw error;
    if (!data?.success) {
      return {
        success: false as const,
        error:
          data?.error ||
          (canonicalName
            ? "Lỗi khi gán quyền."
            : "Chưa gỡ được vai trò đăng nhập — cần apply migrate clear RPC, hoặc gỡ tại Phân quyền."),
      };
    }

    await logAdminAction({
      action: "CHANGE_RBAC_ROLE",
      targetTable: "mdm_nhan_su",
      targetId: input.staffId,
      after: { roleName: canonicalName || null },
      actorUserId: actor.id,
      actorEmail: actor.email,
    });

    await invalidateUserPermissionsCache();
    revalidateNhanSuTaiKhoan();
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
    const parsed = parseOrFirstError(provisionStaffAuthAccountSchema, params);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const supabase = createAdminSupabaseClient();

    const pw = parsed.data.password;

    const { data: staff, error: sErr } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("id, email, ma_nv, auth_user_id, is_active, extra_data, vai_tro_he_thong_ksnk")
      .eq("id", parsed.data.staffId)
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
    await logAdminAction({
      action: "PROVISION_AUTH_ACCOUNT",
      targetTable: "mdm_nhan_su",
      targetId: staff.id,
      actorUserId: actor.id,
      actorEmail: actor.email,
    });

    // Đồng bộ vai trò KSNK từ hồ sơ (vai_tro → assignable) — cùng hành vi form «Thêm người + Tạo đăng nhập».
    let roleWarning: string | undefined;
    const roleRaw = String((staff as { vai_tro_he_thong_ksnk?: string | null }).vai_tro_he_thong_ksnk || "").trim();
    if (roleRaw) {
      const roleName = resolveAssignableRoleName(roleRaw);
      const canonical =
        RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER.find((x) => x === roleName.toUpperCase()) ?? null;
      if (canonical) {
        const { data: roleData, error: roleErr } = await supabase.rpc("rpc_assign_staff_ksnk_role", {
          p_staff_id: staff.id,
          p_role_name: canonical,
        });
        if (roleErr || !roleData?.success) {
          roleWarning =
            (roleData && typeof roleData === "object" && "error" in roleData
              ? String((roleData as { error?: string }).error || "")
              : "") ||
            roleErr?.message ||
            "Đã tạo tài khoản nhưng chưa gán được vai trò.";
        } else {
          await invalidateUserPermissionsCache();
        }
      }
    }

    revalidateNhanSuTaiKhoan();
    return {
      success: true as const,
      userId: created.user.id,
      ...(roleWarning ? { roleWarning } : {}),
    };
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
    const parsed = parseOrFirstError(adminResetStaffPasswordSchema, params);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const input = parsed.data;
    const reauth = await verifyCurrentActorPassword(input.confirmActorPassword);
    if (!reauth.ok) return { success: false as const, error: reauth.error };

    const supabase = createAdminSupabaseClient();

    const pw = input.password;

    const { data: staff, error: sErr } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("id, auth_user_id, email, is_active")
      .eq("id", input.staffId)
      .maybeSingle();

    if (sErr || !staff) return { success: false as const, error: "Không tìm thấy nhân viên." };
    if (staff.is_active === false) {
      return { success: false as const, error: "Hồ sơ nhân sự không còn hoạt động — không đặt lại mật khẩu." };
    }
    if (!staff.auth_user_id) {
      return { success: false as const, error: "Nhân viên chưa có tài khoản hệ thống." };
    }

    const isSelf = staff.auth_user_id === actor.id;
    const secondEmail = normalizeEmail(String(input.secondApproverEmail || ""));
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
    await logAdminAction({
      action: "ADMIN_RESET_PASSWORD",
      targetTable: "mdm_nhan_su",
      targetId: staff.id,
      after: { confirmMode: isSelf ? "reauth+second_email" : "reauth" },
      actorUserId: actor.id,
      actorEmail: actor.email,
    });

    revalidateNhanSuTaiKhoan();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}
