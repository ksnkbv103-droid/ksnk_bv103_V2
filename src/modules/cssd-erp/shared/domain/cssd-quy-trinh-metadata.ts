/** Gộp metadata cấp phát: key mới đè key trùng, key cũ (VAO_ME, bom_lines, ngoai_le) giữ nguyên. */
export function mergeCssdQuyTrinhMetadata(
  current: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(current || {}), ...patch };
}
