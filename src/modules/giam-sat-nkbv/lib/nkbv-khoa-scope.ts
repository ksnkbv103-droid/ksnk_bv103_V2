import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

/**
 * Phạm vi đọc NKBV theo khoa (lát NK-SCOPE).
 * - Admin, NV KSNK, Hội đồng (xem báo cáo toàn viện): `all`.
 * - Mạng lưới thuần (không kèm vai trò rộng hơn): chỉ khoa của mình; chưa gán khoa → `none`.
 */
export type NkbvKhoaRestriction =
  | { kind: "all" }
  | { kind: "khoa"; khoaId: string }
  | { kind: "none" };

export function resolveNkbvKhoaRestriction(
  scope: Pick<ActorKsnkScope, "isAdmin" | "isNhanVienKsnk" | "isMangLuoiKsnk" | "actorKhoaId" | "roles">,
): NkbvKhoaRestriction {
  const wide = scope.isAdmin || scope.isNhanVienKsnk || scope.roles.includes("HOI_DONG_KSNK");
  if (wide || !scope.isMangLuoiKsnk) return { kind: "all" };
  const khoaId = scope.actorKhoaId?.trim() || "";
  return khoaId ? { kind: "khoa", khoaId } : { kind: "none" };
}

/** Khoa thấy được của một hồ sơ: khoa điều trị hiện tại hoặc bất kỳ khoa nào trên lưới ngày. */
export function nkbvKhoaVisible(
  r: NkbvKhoaRestriction,
  khoaIds: Array<string | null | undefined>,
): boolean {
  if (r.kind === "all") return true;
  if (r.kind === "none") return false;
  return khoaIds.some((k) => String(k ?? "").trim() === r.khoaId);
}
