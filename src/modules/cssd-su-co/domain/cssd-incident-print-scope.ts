import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

/**
 * Phạm vi in biên bản sự cố (PO 2026-11-05): khoa nào in sự cố khoa đó; KSNK/toàn viện in tất cả.
 * Khoa của sự cố = khoa của người báo (nguoi_bao_id → mdm_nhan_su.khoa_id). Fail-closed khi thiếu dữ liệu.
 */
export function canPrintIncidentInScope(
  scope: Pick<ActorKsnkScope, "isAdmin" | "isNhanVienKsnk" | "roles" | "actorKhoaId">,
  incidentKhoaId: string | null | undefined,
): boolean {
  if (scope.isAdmin || scope.isNhanVienKsnk || scope.roles.includes("HOI_DONG_KSNK")) return true;
  const mine = String(scope.actorKhoaId ?? "").trim();
  const theirs = String(incidentKhoaId ?? "").trim();
  return Boolean(mine) && Boolean(theirs) && mine === theirs;
}
