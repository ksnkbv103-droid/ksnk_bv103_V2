export type VstScope = {
  isMangLuoiKsnk: boolean;
  actorKhoaId: string | null;
  actorNhanSuId?: string | null;
};

export type VstSessionScopeRow = {
  id: string;
  khoa_id: string | null;
  nguoi_giam_sat_id?: string | null;
};

type ScopeResolution =
  | { ok: true; targetIds: string[] }
  | { ok: false; error: string };

function isSessionInMangLuoiScope(row: VstSessionScopeRow, scope: VstScope): boolean {
  const myKhoa = scope.actorKhoaId ? String(scope.actorKhoaId) : null;
  const myNs = scope.actorNhanSuId ? String(scope.actorNhanSuId) : null;
  const sessionKhoa = row.khoa_id ? String(row.khoa_id) : null;
  const sessionGs = row.nguoi_giam_sat_id ? String(row.nguoi_giam_sat_id) : null;
  return Boolean((myKhoa && sessionKhoa && myKhoa === sessionKhoa) || (myNs && sessionGs && myNs === sessionGs));
}

/**
 * Kiểm tra danh sách session có nằm trong phạm vi actor hay không.
 * - Thiếu id: báo lỗi.
 * - Mạng lưới KSNK: phiên do mình giám sát HOẶC phiên tại khoa được gán (khớp đọc lịch sử).
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

  if (!scope.actorKhoaId && !scope.actorNhanSuId) {
    return { ok: false, error: "Không xác định được phạm vi khoa của bạn." };
  }

  const rowById = new Map(rows.map((x) => [String(x.id || ""), x]));
  const scopedRows = requestedIds.map((id) => rowById.get(String(id))).filter(Boolean) as VstSessionScopeRow[];
  const outOfScope = scopedRows.filter((x) => !isSessionInMangLuoiScope(x, scope));
  if (outOfScope.length > 0) {
    return { ok: false, error: "Có phiên nằm ngoài phạm vi được phép." };
  }

  return { ok: true, targetIds: requestedIds };
}
