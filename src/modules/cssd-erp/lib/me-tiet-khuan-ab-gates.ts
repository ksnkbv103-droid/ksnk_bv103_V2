/**
 * Domain 18 §5 + 18b PO A×6 — pure Soft gates.
 * Không invent quy tắc lâm sàng ngoài neo 18.
 */

import type { MeQcOutcome } from "./me-tiet-khuan-qc";

/** AB-1 A: mẻ KHÔNG ĐẠT / thu hồi → bộ về Tiếp nhận (không Đóng gói). */
export const AB1_FAIL_TARGET_STATION = "TIEP_NHAN" as const;

/** AB-2 A: Soft không có nhả khẩn implant khi chưa BI âm. */
export const MSG_NO_EMERGENCY_IMPLANT_RELEASE =
  "Mẻ có implant / chờ BI: không được nhả khẩn — chỉ nhả sau BI âm (tổ trưởng).";

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
 * AB-6 A / ME-04: nhả mẻ thường = `edit`; implant HOAN_THANH hoặc nhả từ CHO_BI → `nha_implant`
 * (fallback `qc` khi permission mới chưa seed — xem verifyCssdBatchNhaImplant).
 */
export function requiresToTruongReleaseRight(input: {
  coImplant?: boolean | null;
  /** Nhập BI âm trên mẻ đang CHO_BI → nhả. */
  releasingFromChoBi?: boolean;
  outcome?: MeQcOutcome | null;
}): boolean {
  if (input.releasingFromChoBi) return true;
  if (input.coImplant && input.outcome === "HOAN_THANH") return true;
  /** Plasma/EO nhả với BI AM ngay tại QC cũng cần quyền nhả implant. */
  if (input.outcome === "HOAN_THANH" && input.coImplant) return true;
  return false;
}

/**
 * ME-04: quyền `nha_implant` cho nhả implant / Plasma·EO đạt BI / ghi chờ BI / nhập BI âm.
 * (Khớp 3 RPC: ket_luan_dat khi implant|bi_bat_buoc, ghi_cho_bi, nhap_bi_am.)
 */
export function requiresNhaImplantRight(input: {
  coImplant?: boolean | null;
  biBatBuoc?: boolean | null;
  releasingFromChoBi?: boolean;
  outcome?: MeQcOutcome | null;
}): boolean {
  if (input.releasingFromChoBi) return true;
  if (input.outcome === "CHO_BI") return true;
  if (input.outcome === "HOAN_THANH" && (input.coImplant || input.biBatBuoc)) return true;
  return false;
}

/**
 * Nút «Nhả mẻ» trên phiếu QC. BI chưa đọc + BI bắt buộc → CHO_BI (cần quyền).
 * Không đạt không đi qua đây.
 */
export function meQcPassNeedsNhaImplant(input: {
  coImplant?: boolean | null;
  biBatBuoc?: boolean | null;
  trangThaiBi?: string | null;
}): boolean {
  const bi = String(input.trangThaiBi || "").trim().toUpperCase();
  const chuaDoc = !bi || bi === "CHUA_CO" || bi === "DANG_U";
  const outcome = input.biBatBuoc && chuaDoc ? "CHO_BI" : "HOAN_THANH";
  return requiresNhaImplantRight({
    coImplant: input.coImplant,
    biBatBuoc: input.biBatBuoc,
    outcome,
  });
}
