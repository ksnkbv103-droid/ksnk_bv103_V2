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

/**
 * NKBV-038: phạm vi cho đường đọc DANH SÁCH NGƯỜI BỆNH CÓ DANH TÍNH (census MDRO/RCA, hub, vi sinh…), mặc định ĐÓNG.
 * Toàn viện chỉ cho admin, NV KSNK, Hội đồng và Chủ nhiệm khoa (≡ TK_KSNK, M03) không kiêm Mạng lưới; mọi vai khác
 * có quyền xem NKBV (kể cả vai ngoài KSNK) chỉ thấy khoa của mình, chưa gán khoa → `none`.
 * Khớp `fn_nkbv_actor_khoa_restricted` (migration 20261118130000) để app và RLS không lệch.
 * KHÔNG dùng cho thống kê: phạm vi thống kê vẫn là `resolveNkbvKhoaRestriction`.
 */
export function resolveNkbvIdentityRestriction(
  scope: Pick<ActorKsnkScope, "isAdmin" | "isNhanVienKsnk" | "isMangLuoiKsnk" | "actorKhoaId" | "roles">,
): NkbvKhoaRestriction {
  const wide = scope.isAdmin || scope.isNhanVienKsnk || scope.roles.includes("HOI_DONG_KSNK");
  const cnkToanVien = !scope.isMangLuoiKsnk && scope.roles.includes("CHU_NHIEM_KHOA");
  if (wide || cnkToanVien) return { kind: "all" };
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

/** NKBV-033: cùng câu với GSC (`gsc-read-scope.ts`), không import chéo module. */
export const NKBV_GUEST_IDENTITY_DENIED = "Tài khoản khách chỉ được xem Thống kê VST/GSC.";

export const NKBV_HOI_DONG_IDENTITY_DENIED =
  "Hội đồng KSNK chỉ được xem số liệu NKBV tổng hợp (ẩn danh), không xem danh sách người bệnh có danh tính.";

/**
 * NKBV-041 (PO 2026-11-17, phiếu K5): Hội đồng KSNK thuần ĐƯỢC xem danh sách có danh tính (họ tên, mã bệnh án,
 * mã bệnh nhân) → không còn ai bị chặn. Thay giả định NKBV-032 «Hội đồng ≈ BGĐ, M03 cột «Xa» = ẩn danh».
 * Hàm giữ lại (luôn false) vì `identityDenied` còn nằm trong action và server; dọn hết plumbing đó là việc riêng (SO_NO).
 * Phạm vi khoa (`resolveNkbvKhoaRestriction`) không đổi: Hội đồng vẫn toàn viện.
 */
export function isNkbvHoiDongOnly(
  _scope: Pick<ActorKsnkScope, "isAdmin" | "isNhanVienKsnk" | "isMangLuoiKsnk" | "roles">,
): boolean {
  return false;
}
