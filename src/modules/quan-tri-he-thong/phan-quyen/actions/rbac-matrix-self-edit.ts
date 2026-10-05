/** So sánh tập permission_id (không phụ thuộc thứ tự / trùng). */
export function samePermissionIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const right = new Set(b.map(String));
  return a.every((id) => right.has(String(id)));
}

/**
 * True khi payload thực sự đổi quyền của vai trò đang gắn với actor
 * (trừ ADMIN — server luôn hardcode đủ quyền sau đó).
 *
 * UI gửi ma trận tổng nên chỉ kiểm tra presence roleId sẽ luôn chặn ADMIN.
 */
export function hasSelfRolePermissionEdits(args: {
  matrix: Record<string, string[]>;
  ownRoleIds: Iterable<string>;
  adminRoleId: string | null | undefined;
  existingByRole: Record<string, string[]>;
}): boolean {
  const adminId = args.adminRoleId ? String(args.adminRoleId) : "";
  for (const raw of args.ownRoleIds) {
    const roleId = String(raw);
    if (!roleId || (adminId && roleId === adminId)) continue;
    if (!(roleId in args.matrix)) continue;
    const incoming = args.matrix[roleId] || [];
    const existing = args.existingByRole[roleId] || [];
    if (!samePermissionIdSet(incoming, existing)) return true;
  }
  return false;
}
