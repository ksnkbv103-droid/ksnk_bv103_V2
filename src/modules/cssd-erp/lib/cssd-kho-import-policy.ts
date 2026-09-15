/**
 * Policy import fact quy trình kho — khớp UI `disableSyncFull` trên KhoDungCuPage.
 * Soft-delete hàng loạt tem đang chạy bị chặn phía server (không chỉ UI).
 */
export const CSSD_KHO_IMPORT_SOFT_DELETE_BLOCKED_MESSAGE =
  "Import kho dụng cụ không cho ẩn hàng loạt tem đang chạy. Chỉ thêm/cập nhật an toàn.";

/** Trả message nếu client yêu cầu softDeleteMissing; null = được phép tiếp (luôn safe). */
export function rejectCssdKhoImportSoftDelete(softDeleteMissing: boolean): string | null {
  if (softDeleteMissing) return CSSD_KHO_IMPORT_SOFT_DELETE_BLOCKED_MESSAGE;
  return null;
}

/** Đếm tem sẽ bị ẩn nếu soft-delete được bật (dùng dry-run / audit; policy vẫn chặn ghi). */
export function countCssdKhoImportDeactivations(
  existingCodes: Iterable<string>,
  importedCodes: ReadonlySet<string>,
  softDeleteMissing: boolean,
): number {
  if (!softDeleteMissing) return 0;
  let n = 0;
  for (const code of existingCodes) {
    if (!importedCodes.has(code)) n += 1;
  }
  return n;
}
