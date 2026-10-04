/**
 * Domain 18 §5 + 18b PO A×6 — pure Soft gates.
 * Không invent quy tắc lâm sàng ngoài neo 18.
 */

import type { MeQcOutcome } from "./me-tiet-khuan-qc";

/** AB-1 A: mẻ KHÔNG ĐẠT / thu hồi → bộ về Tiếp nhận (không Đóng gói). */
export const AB1_FAIL_TARGET_STATION = "TIEP_NHAN" as const;

/** AB-2 A: Soft không có nhả khẩn implant khi chưa BI âm. */
export const MSG_NO_EMERGENCY_IMPLANT_RELEASE =
  "Mẻ implant / chờ BI: Soft chặn nhả khẩn — chỉ nhả sau BI âm (tổ trưởng).";

/** Soft never allows emergency implant release (AB-2 A). */
export function isEmergencyImplantReleaseAllowed(): false {
  return false;
}

/**
 * Defense-in-depth AB-2: implant không được HOAN_THANH khi BI chưa âm.
 * evaluateMeQcRelease đã đẩy CHO_BI; hàm này khóa thêm nếu outcome lệch.
 */
export function assertImplantReleaseWithoutBiBlocked(input: {
  coImplant?: boolean | null;
  trangThaiBi?: string | null;
  outcome: MeQcOutcome;
}): { ok: true } | { ok: false; message: string } {
  if (!input.coImplant) return { ok: true };
  if (input.outcome !== "HOAN_THANH") return { ok: true };
  const bi = String(input.trangThaiBi || "").trim().toUpperCase();
  if (bi === "AM") return { ok: true };
  return { ok: false, message: MSG_NO_EMERGENCY_IMPLANT_RELEASE };
}

/**
 * AB-6 A: nhả mẻ thường = NV/QC có `edit`; implant HOAN_THANH hoặc nhả từ CHO_BI → tổ trưởng (`qc`).
 * Soft maps «tổ trưởng» → RBAC `CSSD_ME_TIET_KHUAN.qc` (không invent role mới).
 */
export function requiresToTruongReleaseRight(input: {
  coImplant?: boolean | null;
  /** Nhập BI âm trên mẻ đang CHO_BI → nhả. */
  releasingFromChoBi?: boolean;
  outcome?: MeQcOutcome | null;
}): boolean {
  if (input.releasingFromChoBi) return true;
  if (input.coImplant && input.outcome === "HOAN_THANH") return true;
  return false;
}
