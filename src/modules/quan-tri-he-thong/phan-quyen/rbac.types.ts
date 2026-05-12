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
