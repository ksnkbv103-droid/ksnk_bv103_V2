export type VstScope = {
  isMangLuoiKsnk: boolean;
  actorKhoaId: string | null;
};

export type VstSessionScopeRow = {
  id: string;
  khoa_id: string | null;
};

type ScopeResolution =
  | { ok: true; targetIds: string[] }
  | { ok: false; error: string };

/**
 * Kiểm tra danh sách session có nằm trong phạm vi actor hay không.
 * - Thiếu id: báo lỗi.
 * - Mạng lưới KSNK: chỉ được thao tác phiên cùng khoa.
 */
export function resolveVstScopedSessionIds(
  requestedIds: string[],
  rows: VstSessionScopeRow[],
  scope: VstScope,
): ScopeResolution {
  const idSet = new Set(rows.map((x) => String(x.id || "")));
  const missing = requestedIds.filter((id) => !idSet.has(String(id)));
  if (missing.length > 0) {
    return { ok: false, error: "Một hoặc nhiều phiên không còn tồn tại." };
  }

  if (!scope.isMangLuoiKsnk) {
    return { ok: true, targetIds: requestedIds };
  }

  if (!scope.actorKhoaId) {
    return { ok: false, error: "Không xác định được phạm vi khoa của bạn." };
  }

  const actorKhoaId = String(scope.actorKhoaId);
  const targetIds = rows
    .filter((x) => String(x.khoa_id || "") === actorKhoaId)
    .map((x) => String(x.id || ""))
    .filter(Boolean);

  if (targetIds.length !== requestedIds.length) {
    return { ok: false, error: "Có phiên nằm ngoài phạm vi khoa được phép." };
  }

  return { ok: true, targetIds };
}
