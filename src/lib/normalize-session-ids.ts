/** Giới hạn số id một lần gọi action hàng loạt (xóa/đánh dấu đã xem phiên giám sát). */
export const MAX_SESSION_IDS_PER_CALL = 200;

/** Chuẩn hóa danh sách id: bỏ rỗng, bỏ trùng; vượt trần thì báo lỗi thay vì cắt âm thầm. */
export function normalizeSessionIds(
  raw: string[] | null | undefined,
): { ok: true; ids: string[] } | { ok: false; error: string } {
  const ids = Array.from(new Set((raw || []).map((x) => String(x).trim()).filter(Boolean)));
  if (ids.length > MAX_SESSION_IDS_PER_CALL) {
    return { ok: false, error: `Tối đa ${MAX_SESSION_IDS_PER_CALL} phiên mỗi lần thao tác.` };
  }
  return { ok: true, ids };
}
