/** Kiểu dùng chung cho ma trận RBAC (tránh any, đồng bộ với bảng roles/permissions). */

export type RBACRoleRow = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RBACPermissionRow = {
  id: string;
  module_name: string;
  action: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RBACMappingRow = {
  id?: string;
  role_id: string;
  permission_id: string;
};

export type RBACDataSuccess = {
  success: true;
  roles: RBACRoleRow[];
  permissions: RBACPermissionRow[];
  mappings: RBACMappingRow[];
};

export type RBACDataResult = RBACDataSuccess | { success: false; error: string };

/**
 * Thứ tự cột ma trận phân quyền BV103 — chỉ các vai trò này.
 * Không hiển thị `MANG_LUOI_KSNK` (legacy) hay vai trò khác trong `dm_roles`.
 */
export const RBAC_MATRIX_COLUMN_ROLE_ORDER = [
  "ADMIN",
  "HOI_DONG_KSNK",
  "NHAN_VIEN_KSNK",
  "TO_TRUONG_MANG_LUOI_KSNK",
  "THANH_VIEN_MANG_LUOI_KSNK",
] as const;

const RBAC_MATRIX_COLUMN_ROLE_SET = new Set<string>(RBAC_MATRIX_COLUMN_ROLE_ORDER.map((s) => s));

/** Nhãn hiển thị trên cột ma trận (tiếng Việt ngắn). */
export const RBAC_MATRIX_ROLE_HEADER_LABEL: Record<string, string> = {
  ADMIN: "Quản trị",
  HOI_DONG_KSNK: "Hội đồng KSNK",
  NHAN_VIEN_KSNK: "Nhân viên khoa KSNK",
  TO_TRUONG_MANG_LUOI_KSNK: "Tổ trưởng tổ KSNK khoa",
  THANH_VIEN_MANG_LUOI_KSNK: "Thành viên mạng lưới KSNK",
};

export function isRbacMatrixColumnRole(name: string | null | undefined): boolean {
  return RBAC_MATRIX_COLUMN_ROLE_SET.has(String(name ?? "").trim().toUpperCase());
}

/** Lọc + sắp xếp vai trò theo thứ tự cột ma trận (chỉ các dòng có trong DB). */
export function selectRolesForRbacMatrixColumns(allRoles: RBACRoleRow[]): RBACRoleRow[] {
  const byName = new Map(allRoles.map((r) => [String(r.name ?? "").trim().toUpperCase(), r]));
  const out: RBACRoleRow[] = [];
  for (const key of RBAC_MATRIX_COLUMN_ROLE_ORDER) {
    const row = byName.get(key);
    if (row) out.push(row);
  }
  return out;
}

/** Vai trò KSNK gán cho nhân sự (không ADMIN — quản trị gán riêng). */
export const RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER = [
  "HOI_DONG_KSNK",
  "NHAN_VIEN_KSNK",
  "TO_TRUONG_MANG_LUOI_KSNK",
  "THANH_VIEN_MANG_LUOI_KSNK",
] as const;

export function selectRolesForStaffKsnkAssignment<T extends { id: string; name: string }>(allRoles: T[]): T[] {
  const byName = new Map(allRoles.map((r) => [String(r.name ?? "").trim().toUpperCase(), r]));
  const out: T[] = [];
  for (const key of RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER) {
    const row = byName.get(key);
    if (row) out.push(row);
  }
  return out;
}
