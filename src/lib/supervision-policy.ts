import type { SupabaseClient } from "@supabase/supabase-js";

export const HINH_THUC_TU_GIAM_SAT = "Tự giám sát";
export const HINH_THUC_CHUYEN_TRACH = "Giám sát chuyên trách";
export const HINH_THUC_GIAM_SAT_CHEO = "Giám sát chéo";

const normalize = (v: string | null | undefined) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function isKsnkDepartmentName(name: string | null | undefined) {
  const n = normalize(name);
  return n.includes("kiem soat nhiem khuan") || n.includes("ksnk");
}

function isNetworkRoleName(name: string | null | undefined) {
  const n = normalize(name);
  return n.includes("mang luoi");
}

/** Vai trò hệ thống (bảng `roles`) được phép đứng tên giám sát khi đã có quyền module giám sát. */
const SUPERVISION_ELIGIBLE_ROLE_NAMES = new Set(
  [
    "ADMIN",
    "NHAN_VIEN_KSNK",
    "TO_TRUONG_MANG_LUOI_KSNK",
    "THANH_VIEN_MANG_LUOI_KSNK",
    "MANG_LUOI_KSNK",
    "CHI_HUY_KHOA",
    "GIAM_DOC",
  ].map((s) => s.toUpperCase()),
);

async function userHasSupervisionEligibleRole(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<boolean> {
  const uid = String(authUserId || "").trim();
  if (!uid) return false;
  const { data, error } = await supabase.from("sys_user_roles").select("sys_roles(name)").eq("user_id", uid);
  if (error || !data?.length) return false;
  return data.some((row: { sys_roles?: { name?: string } | { name?: string }[] | null }) => {
    const rel = row.sys_roles;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return Boolean(name && SUPERVISION_ELIGIBLE_ROLE_NAMES.has(String(name).trim().toUpperCase()));
  });
}

export type ResolveSupervisorPolicyParams = {
  supabase: SupabaseClient;
  supervisorId: string;
  selectedKhoaId: string | null;
  /** `auth.users.id` của phiên đang thực hiện lưu — dùng kiểm RBAC + khớp hồ sơ đăng nhập. */
  actorAuthUserId?: string | null;
};

export async function resolveSupervisorPolicy(params: ResolveSupervisorPolicyParams) {
  const { supabase, supervisorId, selectedKhoaId, actorAuthUserId } = params;
  const { data: profile, error: pErr } = await supabase
    .from("mdm_nhan_su")
    .select("id, khoa_id, vai_tro_he_thong_id, auth_user_id")
    .eq("id", supervisorId)
    .maybeSingle();
  if (pErr) throw new Error(`Người giám sát: ${pErr.message}`);
  if (!profile?.id) throw new Error("Người giám sát không tồn tại trong hồ sơ nhân sự.");

  const [khoaRes, roleRes] = await Promise.all([
    profile.khoa_id
      ? supabase.from("mdm_dm_khoa_phong").select("ten_khoa").eq("id", profile.khoa_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
    profile.vai_tro_he_thong_id
      ? supabase.from("sys_roles").select("name").eq("id", profile.vai_tro_he_thong_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
  ]);
  if (khoaRes.error) throw new Error(`Khoa của người giám sát: ${khoaRes.error.message}`);
  if (roleRes.error) throw new Error(`Vai trò hệ thống của người giám sát: ${roleRes.error.message}`);

  const isKsnkDept = isKsnkDepartmentName(khoaRes.data?.ten_khoa);
  const roleTen = (roleRes.data as { name?: string } | null)?.name;
  const isNetworkRole = isNetworkRoleName(roleTen);

  const samePersonAsActor = Boolean(
    actorAuthUserId &&
      (String(profile.auth_user_id || "") === String(actorAuthUserId) ||
        String(profile.id) === String(actorAuthUserId)),
  );

  const authUserIdToCheck = String(profile.auth_user_id || "").trim() || (samePersonAsActor ? String(actorAuthUserId) : "");

  let roleEligible = false;
  if (authUserIdToCheck) {
    roleEligible = await userHasSupervisionEligibleRole(supabase, authUserIdToCheck);
  }

  // Bypass theo actor: nếu tài khoản đang thực thi là role hợp lệ (đặc biệt ADMIN),
  // vẫn cho phép lưu phiên giám sát dù hồ sơ được chọn chưa đủ metadata danh mục.
  let actorRoleEligible = false;
  if (actorAuthUserId) {
    actorRoleEligible = await userHasSupervisionEligibleRole(
      supabase,
      String(actorAuthUserId),
    );
  }

  const allowed = isKsnkDept || isNetworkRole || roleEligible || actorRoleEligible;
  if (!allowed) {
    throw new Error(
      "Người giám sát không hợp lệ: cần nhân sự Khoa KSNK / mạng lưới (theo danh mục), hoặc tài khoản có vai trò được phép giám sát (ADMIN, nhân viên KSNK, mạng lưới…).",
    );
  }

  const isNetworkAtSelectedKhoa = Boolean(
    isNetworkRole && selectedKhoaId && String(profile.khoa_id || "") === String(selectedKhoaId),
  );
  const crossKhoa = Boolean(
    selectedKhoaId &&
      profile.khoa_id &&
      String(profile.khoa_id) !== String(selectedKhoaId),
  );

  let derivedHinhThuc: string;
  if (isNetworkAtSelectedKhoa) {
    derivedHinhThuc = HINH_THUC_TU_GIAM_SAT;
  } else if (isKsnkDept) {
    // Nhân sự KSNK giám sát (kể cả tại khoa khác) = chuyên trách.
    derivedHinhThuc = HINH_THUC_CHUYEN_TRACH;
  } else if (crossKhoa) {
    // Giám sát viên thuộc khoa khác khoa được giám sát = chéo.
    derivedHinhThuc = HINH_THUC_GIAM_SAT_CHEO;
  } else {
    derivedHinhThuc = HINH_THUC_CHUYEN_TRACH;
  }

  return {
    profile,
    isKsnkDept,
    isNetworkRole,
    isNetworkAtSelectedKhoa,
    derivedHinhThuc,
  };
}
