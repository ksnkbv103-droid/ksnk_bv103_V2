"use server";

/** Tài khoản khách xem Thống kê (KHACH01) — tách khỏi `tai-khoan-nhan-su.actions.ts`. */
import { invalidateUserPermissionsCache } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { logAdminAction } from "@/lib/admin-audit";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { ensureStaffAuthEmailMatchesProfile } from "@/lib/auth/staff-auth-email";
import { GUEST_STATS_PILOT_EMAIL, GUEST_STATS_PILOT_HO_TEN, GUEST_STATS_PILOT_MA_NV, GUEST_STATS_ROLE_NAME } from "@/lib/auth/guest-stats-pilot";
import { parseOrFirstError, setupGuestStatsPilotAccountSchema } from "@/lib/validations/tai-khoan-nhan-su.validations";
import { revalidateNhanSuTaiKhoan } from "@/modules/quan-tri-he-thong/actions/revalidate-quan-tri";

function err(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

const AUTH_LIST_PAGE_SIZE = 200;
const AUTH_LIST_MAX_PAGES = 50;

/** supabase-js v2 không có tra theo email — duyệt từng trang cho đến khi thấy (không cắt ở 200 user đầu). */
async function findAuthUserByEmail(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
) {
  for (let page = 1; page <= AUTH_LIST_MAX_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: AUTH_LIST_PAGE_SIZE });
    if (error) throw error;
    const found = data.users.find((u) => normalizeEmail(u.email || "") === email);
    if (found) return found;
    if (data.users.length < AUTH_LIST_PAGE_SIZE) return null;
  }
  return null;
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
    const actor = await ensureRbacAdmin();
    const parsed = parseOrFirstError(setupGuestStatsPilotAccountSchema, params);
    if (!parsed.ok) return { success: false as const, error: parsed.error };
    const supabase = createAdminSupabaseClient();

    const pw = parsed.data.password;
    const email = normalizeEmail(parsed.data.email || GUEST_STATS_PILOT_EMAIL);

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
        const found = await findAuthUserByEmail(supabase, email);
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

    await logAdminAction({
      action: "SETUP_GUEST_STATS_ACCOUNT",
      targetTable: "mdm_nhan_su",
      targetId: staffId,
      actorUserId: actor.id,
      actorEmail: actor.email,
    });
    await invalidateUserPermissionsCache();
    revalidateNhanSuTaiKhoan();
    return { success: true as const, email, staffId };
  } catch (e: unknown) {
    return { success: false as const, error: err(e) };
  }
}
