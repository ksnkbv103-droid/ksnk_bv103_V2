import { isCssdSubBoMa, isCssdUnifiedBoMa, isRejectedLegacyHexBoQr } from "@/lib/domain/cssd-bo-ma";

export type CssdQrTargetType = "INSTRUMENT_SET" | "MACHINE" | "STERILIZATION_BATCH" | "UNKNOWN";

const CSSD_CYCLE_QR_PREFIX = "BV103-CYC-" as const;
/** Mã phiếu/mẻ tiệt khuẩn — quét để truy vết toàn mẻ. */
export const CSSD_BATCH_QR_PREFIX = "LOT-" as const;

export function normalizeCssdCode(raw: string | null | undefined): string {
  return String(raw || "").trim().toUpperCase();
}

export function classifyCssdCode(raw: string | null | undefined): CssdQrTargetType {
  const code = normalizeCssdCode(raw);
  if (!code) return "UNKNOWN";
  if (isRejectedLegacyHexBoQr(code)) return "UNKNOWN";
  if (code.startsWith(CSSD_BATCH_QR_PREFIX)) return "STERILIZATION_BATCH";
  if (isCssdUnifiedBoMa(code) || isCssdSubBoMa(code)) return "INSTRUMENT_SET";
  if (code.startsWith(CSSD_CYCLE_QR_PREFIX)) return "INSTRUMENT_SET";
  if (code.startsWith("TB-") || code.startsWith("MAY-")) return "MACHINE";
  return "UNKNOWN";
}

/** OR filter Supabase — QR bộ / chu trình / cycle (SSOT cho hub + workflow). */
export function buildCssdQuyTrinhQrOrFilter(code: string): string {
  const c = normalizeCssdCode(code);
  return `ma_cycle_qr.eq.${c},ma_qr_bo_vinh_vien.eq.${c},ma_qr_quy_trinh.eq.${c}`;
}

/** Khớp mã máy in tem (`ma_thiet_bi`) hoặc mã QR phụ (`ma_qr_thiet_bi`, …). */
export function matchesDeviceCode(
  inputCode: string | null | undefined,
  machineCode: string | null | undefined,
  altCodes?: Array<string | null | undefined>,
): boolean {
  const input = normalizeCssdCode(inputCode);
  if (!input) return false;
  if (normalizeCssdCode(machineCode) === input) return true;
  return (altCodes || []).some((c) => normalizeCssdCode(c) === input);
}
