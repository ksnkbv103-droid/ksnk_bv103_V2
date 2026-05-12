/** Cho phép thêm / sửa / xóa phiên giám sát sau khi tạo (30 phút). */
export const SUPERVISION_SESSION_MUTATION_WINDOW_MS = 30 * 60 * 1000;

export function isSupervisionSessionMutationExpired(createdAtIso: string | null | undefined): boolean {
  if (createdAtIso == null || createdAtIso === "") return true;
  const t = Date.parse(String(createdAtIso));
  if (Number.isNaN(t)) return true;
  return Date.now() - t > SUPERVISION_SESSION_MUTATION_WINDOW_MS;
}

export const SUPERVISION_SESSION_MUTATION_EXPIRED_VI =
  "Đã quá 30 phút kể từ lúc tạo phiên — không được thêm, sửa hay xóa nữa.";
