import type { SupabaseClient } from "@supabase/supabase-js";

type PermRow = { id: string; module_name: string; action: string };

export const KSNK_RBAC_ROLE_NAMES = [
  "NHAN_VIEN_KSNK",
  "HOI_DONG_KSNK",
  "MANG_LUOI_KSNK",
  "TO_TRUONG_MANG_LUOI_KSNK",
  "THANH_VIEN_MANG_LUOI_KSNK",
  // Reform v4 (Slice 9): hai vai trò tiếp nhận ticket RCA. Khớp tên thực tế trong
  // `dm_khoa_phong`: `QLCL` = Ban Quản lý Chất lượng Bệnh viện, `C15` = Khoa Trang bị.
  "BAN_QLCL",
  "KHOA_TRANG_BI",
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

/** Nhập liệu mạng lưới — giám sát + công việc + sự cố + xem dashboard/danh mục. */
function isNetworkOperatorPerm(p: PermRow): boolean {
  const m = mod(p);
  const a = act(p);
  if (isDashboardFamilyView(p)) return true;
  if (isDashboardCcExport(p)) return true;
  if (m === "DANH_MUC" && a === "view") return true;
  if (m === "GIAM_SAT_NKBV" && a === "view") return true;
  if (m === "BAO_SU_CO" && ["view", "create"].includes(a)) return true;
  if (m === "GIAM_SAT_VST" && ["view", "create", "edit", "delete"].includes(a)) return true;
  if (m === "GIAM_SAT_CHUNG" && ["view", "create", "edit", "delete"].includes(a)) return true;
  if (m === "CONG_VIEC" && ["view", "create", "edit", "delete"].includes(a)) return true;
  return false;
}

/** Nhân viên khoa KSNK — vận hành lõi + MDM nhân sự/bảng kiểm; PHAN_QUYEN chỉ xem. */
function isKsnkStaffPerm(p: PermRow): boolean {
  const m = mod(p);
  const a = act(p);

  if (m === "PHAN_QUYEN") return a === "view";

  if (isDashboardFamilyView(p)) return true;
  if (isDashboardCcExport(p)) return true;

  if (m === "DANH_MUC" && a === "view") return true;

  if (["NHAN_SU", "BANG_KIEM", "CONG_VIEC"].includes(m)) {
    return ["view", "create", "edit", "delete", "import"].includes(a);
  }



  if (m === "BAO_SU_CO") return ["view", "create"].includes(a);

  if (["GIAM_SAT_VST", "GIAM_SAT_CHUNG", "GIAM_SAT_NKBV"].includes(m)) {
    return ["view", "create", "edit", "delete", "import"].includes(a);
  }

  const cssd = [
    "CSSD_WORKFLOW",
    "CSSD_KHO_DUNGCU",
    "CSSD_REPORT",
    "CSSD_ME_TIET_KHUAN",
    "CSSD_DM_DUNGCU",
    "CSSD_DM_THIETBI",
    "CSSD_DM_HOACHAT",
    "KSNK_KHO_HOACHAT",
  ];
  if (cssd.includes(m)) {
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
  if (dmDetail.includes(m)) return a === "view";

  return false;
}

/**
 * Vai trò tiếp nhận ticket RCA (reform v4, Slice 9).
 *
 * Quyền chung cho cả `BAN_QLCL` và `KHOA_TRANG_BI`:
 *  - Dashboard family view + export → đọc báo cáo compliance.
 *  - GIAM_SAT_CHUNG / GIAM_SAT_VST `view` → mở session/observation gốc của ticket.
 *  - MDM_FAILURE_REASON `view` → tra danh mục căn nguyên lỗi.
 *  - RCA_TICKET `view, assign, close` → chủ trì xử lý ticket.
 *  - DANH_MUC `view` → tra mã khoa/phòng cần tham chiếu.
 *
 * Lọc theo `phong_ban_xu_ly` đúng phòng được thực thi ở tầng app (queue UI).
 * RLS hiện tại cho phép bất cứ ai có RCA_TICKET.assign/close cập nhật ticket;
 * khi cần siết, bổ sung policy lọc theo `phong_ban_xu_ly` trong migration sau.
 */
function isRcaHandlerPerm(p: PermRow): boolean {
  const m = mod(p);
  const a = act(p);
  if (isDashboardFamilyView(p)) return true;
  if (isDashboardCcExport(p)) return true;
  if (m === "DANH_MUC" && a === "view") return true;
  if (m === "GIAM_SAT_CHUNG" && a === "view") return true;
  if (m === "GIAM_SAT_VST" && a === "view") return true;
  return false;
}

const matchers: Record<string, (p: PermRow) => boolean> = {
  NHAN_VIEN_KSNK: isKsnkStaffPerm,
  HOI_DONG_KSNK: isCouncilPerm,
  MANG_LUOI_KSNK: isNetworkOperatorPerm,
  TO_TRUONG_MANG_LUOI_KSNK: isNetworkOperatorPerm,
  THANH_VIEN_MANG_LUOI_KSNK: isNetworkOperatorPerm,
  BAN_QLCL: isRcaHandlerPerm,
  KHOA_TRANG_BI: isRcaHandlerPerm,
};

/** Đồng bộ vai trò KSNK + ma trận quyền mặc định (idempotent). */
export async function syncKsnkRolePermissionMappings(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const ROLE_DESCRIPTIONS: Record<(typeof KSNK_RBAC_ROLE_NAMES)[number], string> = {
    NHAN_VIEN_KSNK: "Nhân viên khoa Kiểm soát nhiễm khuẩn",
    HOI_DONG_KSNK: "Hội đồng KSNK — chủ yếu xem báo cáo",
    MANG_LUOI_KSNK: "Mạng lưới KSNK (vai trò hệ thống)",
    TO_TRUONG_MANG_LUOI_KSNK: "Tổ trưởng tổ mạng lưới KSNK theo khoa",
    THANH_VIEN_MANG_LUOI_KSNK: "Thành viên mạng lưới KSNK theo khoa",
    BAN_QLCL: "Ban Quản lý Chất lượng Bệnh viện — tiếp nhận ticket RCA hệ thống",
    KHOA_TRANG_BI: "Khoa Trang bị — tiếp nhận ticket RCA về thiết bị/nguồn lực",
  };

  const roleRows = KSNK_RBAC_ROLE_NAMES.map((name) => ({
    name,
    description: ROLE_DESCRIPTIONS[name],
    updated_at: now,
  }));

  const { error: roleUpsertErr } = await supabase.from("dm_roles").upsert(roleRows, {
    onConflict: "name",
  });
  if (roleUpsertErr) throw roleUpsertErr;

  const { data: allPerms, error: pErr } = await supabase
    .from("dm_permissions")
    .select("id, module_name, action");
  if (pErr) throw pErr;
  const perms = (allPerms || []) as PermRow[];
  if (!perms.length) return;

  const { data: ksnkRoles, error: rErr } = await supabase
    .from("dm_roles")
    .select("id, name")
    .in("name", [...KSNK_RBAC_ROLE_NAMES]);
  if (rErr) throw rErr;

  for (const role of ksnkRoles || []) {
    const name = role.name as (typeof KSNK_RBAC_ROLE_NAMES)[number];
    const matcher = matchers[name];
    if (!matcher) continue;

    const { error: delErr } = await supabase.from("rel_role_permissions").delete().eq("role_id", role.id);
    if (delErr) throw delErr;

    const seenPid = new Set<string>();
    const picks = [];
    for (const p of perms) {
      if (!matcher(p) || seenPid.has(p.id)) continue;
      seenPid.add(p.id);
      picks.push({ role_id: role.id, permission_id: p.id });
    }
    if (!picks.length) continue;

    const { error: insErr } = await supabase.from("rel_role_permissions").insert(picks);
    if (insErr) throw insErr;
  }
}
