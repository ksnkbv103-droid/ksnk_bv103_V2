export type CssdQrTargetType = "INSTRUMENT_SET" | "MACHINE" | "UNKNOWN";

export const CSSD_INSTRUMENT_QR_PREFIXES = ["BV103-DC-", "BV103-SUB-"] as const;
export const CSSD_CYCLE_QR_PREFIX = "BV103-CYC-" as const;

export function normalizeCssdCode(raw: string | null | undefined): string {
  return String(raw || "").trim().toUpperCase();
}

export function classifyCssdCode(raw: string | null | undefined): CssdQrTargetType {
  const code = normalizeCssdCode(raw);
  if (!code) return "UNKNOWN";
  if (CSSD_INSTRUMENT_QR_PREFIXES.some((prefix) => code.startsWith(prefix))) return "INSTRUMENT_SET";
  if (code.startsWith(CSSD_CYCLE_QR_PREFIX)) return "INSTRUMENT_SET";
  // Thiết bị hiện vận hành bằng ma_thiet_bi tại nhiều màn.
  // Dự phòng nhận cả input theo mã máy (ví dụ MAY-01 / TB-HT-02).
  if (code.startsWith("TB-") || code.startsWith("MAY-")) return "MACHINE";
  return "UNKNOWN";
}

export function matchesDeviceCode(inputCode: string | null | undefined, machineCode: string | null | undefined): boolean {
  const input = normalizeCssdCode(inputCode);
  const machine = normalizeCssdCode(machineCode);
  return Boolean(input && machine && input === machine);
}
