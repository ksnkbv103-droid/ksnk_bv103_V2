export type GscKhoaScope = {
  isMangLuoiKsnk: boolean;
  actorKhoaId: string | null;
};

type ScopeResolution =
  | { ok: true; khoaId: string | null }
  | { ok: false; error: string };

/**
 * Chuẩn hóa khoa theo scope actor.
 * - Mạng lưới KSNK chỉ được thao tác trong khoa của chính họ.
 * - Scope khác giữ nguyên khoa được yêu cầu.
 */
export function resolveGscScopedKhoaId(
  scope: GscKhoaScope,
  requestedKhoaId: string | null,
): ScopeResolution {
  const requested = requestedKhoaId ? String(requestedKhoaId).trim() : null;
  if (!scope.isMangLuoiKsnk) {
    return { ok: true, khoaId: requested };
  }
  const actorKhoaId = scope.actorKhoaId ? String(scope.actorKhoaId).trim() : "";
  if (!actorKhoaId) {
    return { ok: false, error: "Không xác định được phạm vi khoa của bạn." };
  }
  if (requested && requested !== actorKhoaId) {
    return { ok: false, error: "Khoa được yêu cầu nằm ngoài phạm vi được phép." };
  }
  return { ok: true, khoaId: actorKhoaId };
}
