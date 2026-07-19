import type { SupabaseClient } from "@supabase/supabase-js";

type PermRow = { id: string; module_name: string; action: string };

/** Vai trò active có preset sync — không gồm ADMIN (full grant riêng) hay role đã deprecate. */
const KSNK_RBAC_ROLE_NAMES = [
  "NHAN_VIEN_KSNK",
  "HOI_DONG_KSNK",
  "MANG_LUOI_KSNK",
  "KHACH_THONG_KE_GSTT",
] as const;

function mod(p: PermRow) {
  return String(p.module_name || "").toUpperCase();
}

function act(p: PermRow) {
  return String(p.action || "").toLowerCase();
}

/** Hội đồng: chỉ xem mọi module (view-only). */
function isCouncilPerm(p: PermRow): boolean {
  return act(p) === "view";
}

function isDashboardFamilyView(p: PermRow): boolean {
  const m = mod(p);
  const a = act(p);
  if (a !== "view") return false;
  return (
    m === "DASHBOARD" ||
    m === "DASHBOARD_CC_OVERVIEW" ||
    m === "DASHBOARD_CC_SUPERVISION" ||
    m === "DASHBOARD_CC_GAP"
  );
}

function isDashboardCcExport(p: PermRow): boolean {
  return mod(p) === "DASHBOARD_CC_EXPORT" && act(p) === "export";
}

/** Nhập liệu mạng lưới — giám sát + công việc + sự cố; Thống kê qua GIAM_SAT_* view (không Command Center). */
function isNetworkOperatorPerm(p: PermRow): boolean {
  const m = mod(p);
  const a = act(p);
  if (m === "DANH_MUC" && a === "view") return true;
  if (m === "GIAM_SAT_NKBV" && a === "view") return true;
  if (m === "BAO_SU_CO" && ["view", "create"].includes(a)) return true;
  if (m === "GIAM_SAT_VST" && ["view", "create", "edit", "delete"].includes(a)) return true;
  if (m === "GIAM_SAT_CHUNG" && ["view", "create", "edit", "delete"].includes(a)) return true;
  if (m === "CONG_VIEC" && ["view", "create", "edit", "delete"].includes(a)) return true;
  return false;
}

/** Khách xem thống kê — chỉ VST/GSC view; không dashboard / không CRUD. */
function isGuestStatsPerm(p: PermRow): boolean {
  const m = mod(p);
  const a = act(p);
  return a === "view" && (m === "GIAM_SAT_VST" || m === "GIAM_SAT_CHUNG");
}

/** Nhân viên khoa KSNK — vận hành lõi + MDM nhân sự/bảng kiểm; PHAN_QUYEN chỉ xem. */
function isKsnkStaffPerm(p: PermRow): boolean {
  const m = mod(p);
  const a = act(p);

  if (m === "PHAN_QUYEN") return a === "view";

  if (isDashboardFamilyView(p)) return true;
  if (isDashboardCcExport(p)) return true;

  if (m === "DANH_MUC" && a === "view") return true;
  if (["DANH_MUC_ORG", "DANH_MUC_GSTT", "DANH_MUC_CSSD_LOOKUP"].includes(m) && a === "view") return true;

  if (["NHAN_SU", "BANG_KIEM", "CONG_VIEC"].includes(m)) {
    return ["view", "create", "edit", "delete", "import"].includes(a);
  }

  if (m === "BAO_SU_CO") return ["view", "create"].includes(a);

  if (["GIAM_SAT_VST", "GIAM_SAT_CHUNG", "GIAM_SAT_NKBV"].includes(m)) {
    return ["view", "create", "edit", "delete", "import"].includes(a);
  }

  const cssdOps = [
    "CSSD_WORKFLOW",
    "CSSD_KHO_DUNGCU",
    "CSSD_REPORT",
    "CSSD_ME_TIET_KHUAN",
    "KSNK_KHO_HOACHAT",
  ];
  if (cssdOps.includes(m)) {
    if (m === "CSSD_REPORT" && ["view", "export"].includes(a)) return true;
    if (m === "KSNK_KHO_HOACHAT") {
      return ["view", "create", "edit", "export"].includes(a);
    }
    if (m === "CSSD_ME_TIET_KHUAN") {
      return ["view", "create", "edit", "delete", "import", "qc", "lock"].includes(a);
    }
    return ["view", "create", "edit", "delete", "import"].includes(a);
  }

  const dmDetail = [
    "LOAI_DC",
    "BO_DC",
    "DC_LE",
    "THIET_BI",
    "HOA_CHAT",
    "KHOA_PHONG",
    "BANG_KIEM_DETAIL",
  ];
  if (dmDetail.includes(m)) {
    if (["LOAI_DC", "BO_DC", "DC_LE", "THIET_BI", "HOA_CHAT"].includes(m)) {
      return ["view", "create", "edit", "delete", "import"].includes(a);
    }
    return a === "view";
  }

  return false;
}

const matchers: Record<(typeof KSNK_RBAC_ROLE_NAMES)[number], (p: PermRow) => boolean> = {
  NHAN_VIEN_KSNK: isKsnkStaffPerm,
  HOI_DONG_KSNK: isCouncilPerm,
  MANG_LUOI_KSNK: isNetworkOperatorPerm,
  KHACH_THONG_KE_GSTT: isGuestStatsPerm,
};

/**
 * Áp dụng lại ma trận quyền mặc định cho các vai trò KSNK active (ghi đè mapping).
 * Không đụng ADMIN. Không tái kích hoạt role đã soft-deprecate.
 */
export async function syncKsnkRolePermissionMappings(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const ROLE_DESCRIPTIONS: Record<(typeof KSNK_RBAC_ROLE_NAMES)[number], string> = {
    NHAN_VIEN_KSNK: "Nhân viên khoa Kiểm soát nhiễm khuẩn",
    HOI_DONG_KSNK: "Hội đồng KSNK — chủ yếu xem báo cáo",
    MANG_LUOI_KSNK: "Mạng lưới KSNK — nhập liệu giám sát theo khoa (gồm tổ trưởng và thành viên)",
    KHACH_THONG_KE_GSTT: "Khách — chỉ xem Thống kê VST và GSC (tài khoản chung)",
  };

  const roleRows = KSNK_RBAC_ROLE_NAMES.map((name) => ({
    name,
    description: ROLE_DESCRIPTIONS[name],
    is_active: true,
    updated_at: now,
  }));

  const { error: roleUpsertErr } = await supabase.from("sys_roles").upsert(roleRows, {
    onConflict: "name",
  });
  if (roleUpsertErr) throw roleUpsertErr;

  const { data: allPerms, error: pErr } = await supabase
    .from("sys_permissions")
    .select("id, module_name, action");
  if (pErr) throw pErr;
  const perms = (allPerms || []) as PermRow[];
  if (!perms.length) return;

  const { data: ksnkRoles, error: rErr } = await supabase
    .from("sys_roles")
    .select("id, name")
    .in("name", [...KSNK_RBAC_ROLE_NAMES])
    .eq("is_active", true);
  if (rErr) throw rErr;

  for (const role of ksnkRoles || []) {
    const name = role.name as (typeof KSNK_RBAC_ROLE_NAMES)[number];
    const matcher = matchers[name];
    if (!matcher) continue;

    const { error: delErr } = await supabase.from("sys_role_permissions").delete().eq("role_id", role.id);
    if (delErr) throw delErr;

    const seenPid = new Set<string>();
    const picks = [];
    for (const p of perms) {
      if (!matcher(p) || seenPid.has(p.id)) continue;
      seenPid.add(p.id);
      picks.push({ role_id: role.id, permission_id: p.id });
    }
    if (!picks.length) continue;

    const { error: insErr } = await supabase.from("sys_role_permissions").insert(picks);
    if (insErr) throw insErr;
  }
}
