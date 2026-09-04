import { addDaysYmd, todayYmdInVn } from "@/lib/format-datetime-vi";

/** Pure helpers — PM due status & machine display for CSSD equipment. */

export type PmDueStatus = "OK" | "SAP_DEN" | "QUA_HAN" | "CHUA_CO_LICH";

export function pmDueStatus(ngayBaoTriTiepTheo: string | null | undefined, todayYmd?: string): PmDueStatus {
  const raw = String(ngayBaoTriTiepTheo || "").trim().slice(0, 10);
  if (!raw) return "CHUA_CO_LICH";
  const today = todayYmd || todayYmdInVn();
  if (raw < today) return "QUA_HAN";
  const warn = addDaysYmd(today, 7);
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
  if (s === "HOLD_QC") return "Tạm giữ QC";
  if (s === "BROKEN") return "Hỏng";
  if (s === "RETIRED") return "Ngưng dùng";
  return s || "—";
}

