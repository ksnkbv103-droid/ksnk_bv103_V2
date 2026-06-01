"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";

import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";

function err(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

import type { StaffAuthRow } from "@/types/nhan-su";
import {
  RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER,
  selectRolesForStaffKsnkAssignment,
} from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";

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
    const { data, error } = await supabase.from("dm_roles").select("id, name").order("name");
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
          "Chỉ được gán một trong: Hội đồng KSNK, Nhân viên khoa KSNK, Tổ trưởng tổ KSNK khoa, Thành viên mạng lưới KSNK.",
      };
    }

    // Kiểm tra role tồn tại trong DB
    const { data: roleExists } = await supabase
      .from("dm_roles")
      .select("id")
      .eq("name", canonicalName)
      .maybeSingle();

    if (!roleExists) {
      return { success: false as const, error: "Vai trò không hợp lệ hoặc không tồn tại trong hệ thống." };
    }

    // Sử dụng RPC nguyên tử để tránh lỗi mất quyền khi thực hiện nhiều bước
    const { data, error } = await supabase.rpc("rpc_assign_staff_ksnk_role", {
      p_staff_id: params.staffId,
      p_role_name: canonicalName,
    });

    if (error) throw error;
    if (!data?.success) return { success: false as const, error: data?.error || "Lỗi khi gán quyền." };

    revalidatePath("/quan-tri-he-thong/tai-khoan-nhan-su");
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
    await ensureRbacAdmin();
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
      user_metadata: { ma_nv: staff.ma_nv },
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

    revalidatePath("/quan-tri-he-thong/tai-khoan-nhan-su");
    return { success: true as const, userId: created.user.id };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}

/**
 * Admin thay đổi/đặt lại mật khẩu đăng nhập cho nhân viên.
 * Không cần xác nhận qua email, cập nhật trực tiếp qua Auth Admin API.
 */
export async function adminResetStaffPasswordAction(params: {
  staffId: string;
  password: string;
}) {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    const pw = params.password;
    if (!pw || pw.length < 8) {
      return { success: false as const, error: "Mật khẩu tối thiểu 8 ký tự." };
    }

    const { data: staff, error: sErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, auth_user_id")
      .eq("id", params.staffId)
      .maybeSingle();

    if (sErr || !staff) return { success: false as const, error: "Không tìm thấy nhân viên." };
    if (!staff.auth_user_id) {
      return { success: false as const, error: "Nhân viên chưa có tài khoản hệ thống." };
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      staff.auth_user_id,
      { password: pw }
    );

    if (updateErr) throw updateErr;

    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}

