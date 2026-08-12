/**
 * Can thiệp Foley / Vent / CVC trên timeline BA — SSOT ngày đặt cho association.
 */

import {
  isDeviceCriteriaKey,
  type DeviceCriteriaKey,
} from "./nkbv-criteria-matrix";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";
import type { SyndromePanelId } from "./nkbv-specimen-syndrome";

/** YYYY-MM-DD hoặc rỗng. */
export function isoDateOnly(d: string | null | undefined): string {
  return (d || "").slice(0, 10);
}

/**
 * Can thiệp nội viện: chỉ trong [ngày vào viện … ngày ra viện | hôm nay].
 * (NHSN: đặt trước viện → Day 1 = ngày vào viện — ghi từ VV, không tick trước VV.)
 */
export function isDeviceDateInStay(
  date: string,
  admissionDate: string,
  dischargeDate?: string | null,
  opts?: { asOfDate?: string | null },
): { ok: boolean; reason?: string } {
  const d = isoDateOnly(date);
  const vv = isoDateOnly(admissionDate);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return { ok: false, reason: "Ngày can thiệp không hợp lệ" };
  }
  if (!vv || !/^\d{4}-\d{2}-\d{2}$/.test(vv)) {
    return { ok: false, reason: "Thiếu ngày vào viện — không ghi can thiệp" };
  }
  if (d < vv) {
    return {
      ok: false,
      reason:
        "Không ghi can thiệp trước ngày vào viện (nếu đặt trước viện: tick từ ngày vào viện = Ngày 1)",
    };
  }
  const rv = isoDateOnly(dischargeDate);
  if (rv && d > rv) {
    return { ok: false, reason: "Không ghi can thiệp sau ngày ra viện" };
  }
  const asOf =
    isoDateOnly(opts?.asOfDate) || new Date().toISOString().slice(0, 10);
  if (!rv && d > asOf) {
    return { ok: false, reason: "Không ghi can thiệp sau hôm nay" };
  }
  return { ok: true };
}

/** Lọc ngày can thiệp ngoài khoảng nằm viện (dữ liệu cũ / sổ). */
export function filterCanThiepDatesInStay(
  dates: string[],
  admissionDate: string,
  dischargeDate?: string | null,
): string[] {
  return dates.filter((d) => isDeviceDateInStay(d, admissionDate, dischargeDate).ok);
}

/** Day 1 nội viện = max(đầu đợt, ngày vào viện). */
export function clampDeviceDay1(
  episodeStart: string,
  admissionDate?: string | null,
): string {
  const start = isoDateOnly(episodeStart);
  const vv = isoDateOnly(admissionDate);
  if (!start) return vv;
  if (!vv) return start;
  return start < vv ? vv : start;
}

/** Sổ đăng ký: thứ tự ngày + không đặt sau ra viện. */
export function validateDeviceRegistryDates(input: {
  insertionDate: string;
  removalDate?: string | null;
  firstAccessDate?: string | null;
  admissionDate?: string | null;
  dischargeDate?: string | null;
}): { ok: boolean; reason?: string; warnPreAdmission?: boolean } {
  const ins = isoDateOnly(input.insertionDate);
  if (!ins || !/^\d{4}-\d{2}-\d{2}$/.test(ins)) {
    return { ok: false, reason: "Ngày đặt không hợp lệ" };
  }
  const rem = isoDateOnly(input.removalDate);
  if (rem && rem < ins) {
    return { ok: false, reason: "Ngày rút không được trước ngày đặt" };
  }
  const access = isoDateOnly(input.firstAccessDate);
  if (access && access < ins) {
    return { ok: false, reason: "Ngày tiếp cận đầu không được trước ngày đặt" };
  }
  const rv = isoDateOnly(input.dischargeDate);
  if (rv && ins > rv) {
    return { ok: false, reason: "Không ghi đặt dụng cụ sau ngày ra viện" };
  }
  const vv = isoDateOnly(input.admissionDate);
  const warnPreAdmission = Boolean(vv && ins < vv);
  return { ok: true, warnPreAdmission };
}

export type BaDeviceDayCell = {
  id: string;
  ngay: string;
  key: DeviceCriteriaKey;
  label: string;
};

export type BaDeviceByDate = {
  foley: Record<string, BaDeviceDayCell[]>;
  vent: Record<string, BaDeviceDayCell[]>;
  cvc: Record<string, BaDeviceDayCell[]>;
};

export const DEVICE_CRITERIA_META: Record<
  DeviceCriteriaKey,
  { label: string; short: string; bucket: keyof BaDeviceByDate }
> = {
  device_foley: { label: "Ống thông tiểu lưu (Foley)", short: "Foley", bucket: "foley" },
  device_ventilator: { label: "Thở máy xâm lấn", short: "Vent", bucket: "vent" },
  device_central_line: {
    label: "Đường truyền trung tâm (CVC)",
    short: "CVC",
    bucket: "cvc",
  },
};

export function emptyBaDeviceByDate(): BaDeviceByDate {
  return { foley: {}, vent: {}, cvc: {} };
}

export function deviceKeyForPanel(
  panel: "UTI" | "PNEU" | "BSI" | "VAE" | "SSI" | SyndromePanelId,
): DeviceCriteriaKey | null {
  if (panel === "UTI") return "device_foley";
  if (panel === "PNEU" || panel === "VAE") return "device_ventilator";
  if (panel === "BSI") return "device_central_line";
  return null;
}

export function datesFromDeviceBucket(
  byDate: Record<string, BaDeviceDayCell[]>,
): string[] {
  return Object.keys(byDate)
    .filter((d) => (byDate[d] || []).length > 0)
    .sort();
}

export function canThiepDatesForPanel(
  devices: BaDeviceByDate,
  panel: "UTI" | "PNEU" | "BSI" | "VAE" | "SSI" | SyndromePanelId,
): string[] {
  const key = deviceKeyForPanel(panel);
  if (!key) return [];
  const bucket = DEVICE_CRITERIA_META[key].bucket;
  return datesFromDeviceBucket(devices[bucket]);
}

/** Gom mốc device_* từ timeline. */
export function collectDeviceMilestones(
  milestones: BaTimelineMilestone[],
): BaDeviceByDate {
  const out = emptyBaDeviceByDate();
  for (const m of milestones) {
    const key = m.criteriaKey;
    if (!isDeviceCriteriaKey(key)) continue;
    const d = m.date.slice(0, 10);
    const meta = DEVICE_CRITERIA_META[key];
    const cell: BaDeviceDayCell = {
      id: m.id,
      ngay: d,
      key,
      label: meta.label,
    };
    const bucket = out[meta.bucket];
    if (!bucket[d]) bucket[d] = [];
    if (!bucket[d].some((x) => x.key === key)) bucket[d].push(cell);
  }
  return out;
}
