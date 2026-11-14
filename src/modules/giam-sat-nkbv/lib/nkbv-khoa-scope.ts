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

export const NKBV_KHOA_REQUIRED_ERROR = "Vui lòng chọn khoa điều trị — tài khoản của bạn bị giới hạn theo khoa.";

export const NKBV_HOI_DONG_IDENTITY_DENIED =
  "Hội đồng KSNK chỉ được xem số liệu NKBV tổng hợp (ẩn danh), không xem danh sách người bệnh có danh tính.";

/**
 * NKBV-032: Hội đồng KSNK thuần không nhận danh sách có danh tính (họ tên, mã bệnh án, mã bệnh nhân).
 * Căn cứ: M03 cột BGĐ «Xa» = chỉ xem ẩn danh (mã giả hóa) cho ca NKBV, MDRO, vụ dịch.
 * GIẢ ĐỊNH chờ PO xác nhận: Hội đồng ≈ BGĐ (M03 không có mã vai HOI_DONG; Hội đồng có đại diện BGĐ).
 * Vai kèm theo (admin, NV KSNK, Mạng lưới, CHU_NHIEM_KHOA) tự quyết định phạm vi riêng nên không bị chặn.
 * CHU_NHIEM_KHOA = «Chủ nhiệm khoa KSNK» ≡ TK_KSNK (VST-026; M03 cho TK_KSNK «X*» với MDRO/RCA).
 * Quy ước repo như `gsc-read-scope.ts`: Hội đồng cấp quyền xem, CNK quyết định phạm vi.
 * Chỉ chặn danh sách có danh tính; phạm vi thống kê (`resolveNkbvKhoaRestriction`) vẫn toàn viện.
 */
export function isNkbvHoiDongOnly(
  scope: Pick<ActorKsnkScope, "isAdmin" | "isNhanVienKsnk" | "isMangLuoiKsnk" | "roles">,
): boolean {
  return (
    scope.roles.includes("HOI_DONG_KSNK") &&
    !scope.roles.includes("CHU_NHIEM_KHOA") &&
    !scope.isAdmin &&
    !scope.isNhanVienKsnk &&
    !scope.isMangLuoiKsnk
  );
}
