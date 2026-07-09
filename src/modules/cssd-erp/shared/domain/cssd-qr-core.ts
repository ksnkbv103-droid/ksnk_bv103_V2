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

export function matchesDeviceCode(inputCode: string | null | undefined, machineCode: string | null | undefined): boolean {
  const input = normalizeCssdCode(inputCode);
  const machine = normalizeCssdCode(machineCode);
  return Boolean(input && machine && input === machine);
}
