/**
 * Pure rules for NKBV daily denominator (mẫu số) — census per calendar day.
 * No weekly interpolation: month metrics = SUM of submitted daily rows only.
 */

export type MauSoDailyCensus = {
  so_ngay_dieu_tri: number;
  so_ngay_catheter_cvc: number;
  so_ngay_sonde_tieu: number;
  so_ngay_tho_may: number;
  so_dot_tho_may_emv?: number;
};

export type SoftWarn = { code: string; message: string };

/** Calendar days YYYY-MM-DD in month (local UTC date strings). */
export function listCalendarDaysInMonth(year: number, month1to12: number): string[] {
  const days: string[] = [];
  const last = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) {
    days.push(
      `${year}-${String(month1to12).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return days;
}

export function missingMauSoDays(
  year: number,
  month1to12: number,
  submittedDates: string[],
  /** Don't require future days in current month */
  todayIso?: string,
): string[] {
  const submitted = new Set(submittedDates.map((d) => d.slice(0, 10)));
  const today = (todayIso || new Date().toISOString().slice(0, 10)).slice(0, 10);
  return listCalendarDaysInMonth(year, month1to12).filter((day) => {
    if (day > today) return false;
    return !submitted.has(day);
  });
}

/**
 * Soft warnings when census numbers look like weekly totals dumped into one day.
 * bedCapacity = so_giuong thường + cấp cứu (khoa); if 0/unknown, uses heuristics only.
 */
export function softWarnMauSoDailyCensus(
  census: MauSoDailyCensus,
  bedCapacity?: number | null,
): SoftWarn[] {
  const warns: SoftWarn[] = [];
  const beds = bedCapacity && bedCapacity > 0 ? bedCapacity : null;
  const p = Math.max(0, census.so_ngay_dieu_tri);
  const cvc = Math.max(0, census.so_ngay_catheter_cvc);
  const foley = Math.max(0, census.so_ngay_sonde_tieu);
  const vent = Math.max(0, census.so_ngay_tho_may);

  if (p <= 0) {
    warns.push({
      code: "PATIENT_ZERO",
      message: "Patient-days của ngày báo cáo phải > 0 (số BN hiện diện đúng ngày này).",
    });
  }

  if (beds != null) {
    const limit = beds * 1.5; // allow surge / holdover slack
    for (const [label, n] of [
      ["Patient-days", p],
      ["CVC", cvc],
      ["Foley", foley],
      ["Vent", vent],
    ] as const) {
      if (n > limit) {
        warns.push({
          code: "OVER_BEDS",
          message: `${label}=${n} vượt rõ số giường khoa (~${beds}). Nghi nhập tổng tuần vào 1 ngày — vui lòng kiểm tra.`,
        });
      }
    }
  } else {
    // No bed master: heuristic thresholds for typical ward/ICU day census
    if (p >= 80 || cvc >= 80 || foley >= 80 || vent >= 80) {
      warns.push({
        code: "SUSPECT_WEEKLY",
        message:
          "Số census rất lớn cho một ngày lịch (≥80). Nghi nhập tổng tuần — hệ thống không nội suy; hãy nhập từng ngày.",
      });
    }
  }

  if (cvc > p || foley > p || vent > p) {
    warns.push({
      code: "DEVICE_GT_PATIENT",
      message:
        "Số BN có dụng cụ không thể lớn hơn số BN hiện diện cùng ngày (trừ lỗi đếm). Kiểm tra lại.",
    });
  }

  return warns;
}
