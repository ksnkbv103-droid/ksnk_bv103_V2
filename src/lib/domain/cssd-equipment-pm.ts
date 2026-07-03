/** Pure helpers — PM due status & machine display for CSSD equipment. */

export type PmDueStatus = "OK" | "SAP_DEN" | "QUA_HAN" | "CHUA_CO_LICH";

export function pmDueStatus(ngayBaoTriTiepTheo: string | null | undefined, todayYmd?: string): PmDueStatus {
  const raw = String(ngayBaoTriTiepTheo || "").trim().slice(0, 10);
  if (!raw) return "CHUA_CO_LICH";
  const today = todayYmd || new Date().toISOString().slice(0, 10);
  if (raw < today) return "QUA_HAN";
  const warn = addDaysIso(today, 7);
  if (raw <= warn) return "SAP_DEN";
  return "OK";
}

export function pmDueLabel(status: PmDueStatus): string {
  if (status === "QUA_HAN") return "Quá hạn PM";
  if (status === "SAP_DEN") return "Sắp đến hạn PM";
  if (status === "CHUA_CO_LICH") return "Chưa có lịch PM";
  return "PM ổn định";
}

export function trangThaiMayLabel(st: string | null | undefined): string {
  const s = String(st || "").trim();
  if (s === "READY" || s === "HOAT_DONG") return "Sẵn sàng";
  if (s === "REPAIRING") return "Đang bảo dưỡng/sửa";
  if (s === "BROKEN") return "Hỏng";
  if (s === "RETIRED") return "Ngưng dùng";
  return s || "—";
}

export function isMaySanSangVanHanh(st: string | null | undefined): boolean {
  return ["READY", "HOAT_DONG"].includes(String(st || "").trim());
}

function addDaysIso(dateYmd: string, days: number): string {
  const d = new Date(`${dateYmd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
