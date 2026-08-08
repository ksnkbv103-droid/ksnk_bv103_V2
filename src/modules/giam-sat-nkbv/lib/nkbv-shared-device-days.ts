/**
 * Patient / device day counting — SSOT §1.7
 * Pure functions for registry → denominator preview.
 */

import { daysBetween } from "./nkbv-shared-timeline";

export type DeviceRegistryType = "CENTRAL_LINE" | "FOLEY" | "VENTILATOR";

export type DeviceRegistryRow = {
  device_type: DeviceRegistryType;
  /** Device Day 1 = insertion (Foley/Vent) or first access date for CL when present */
  insertion_date: string;
  removal_date?: string | null;
  /** CLABSI: day-count starts at first inpatient access when set */
  first_access_date?: string | null;
  khoa_id?: string | null;
};

function clampRangeOverlap(
  start: string,
  endExclusiveOrInclusive: string,
  rangeFrom: string,
  rangeTo: string,
): number {
  const s = start.slice(0, 10);
  const e = (endExclusiveOrInclusive || rangeTo).slice(0, 10);
  const from = rangeFrom.slice(0, 10);
  const to = rangeTo.slice(0, 10);
  if (!s || !from || !to) return 0;
  const overlapStart = s > from ? s : from;
  // removal day still counts as a device-day if device present that calendar day
  const overlapEnd = e && e < to ? e : to;
  if (overlapStart > overlapEnd) return 0;
  return daysBetween(overlapStart, overlapEnd) + 1;
}

/** Day-count start for a device per SSOT §1.7 */
export function deviceCountStartDate(row: DeviceRegistryRow): string {
  if (row.device_type === "CENTRAL_LINE" && row.first_access_date) {
    return row.first_access_date.slice(0, 10);
  }
  return row.insertion_date.slice(0, 10);
}

export function countDeviceDaysInRange(
  row: DeviceRegistryRow,
  rangeFrom: string,
  rangeTo: string,
): number {
  const start = deviceCountStartDate(row);
  if (!start) return 0;
  const end = row.removal_date ? row.removal_date.slice(0, 10) : rangeTo.slice(0, 10);
  return clampRangeOverlap(start, end, rangeFrom, rangeTo);
}

export type MauSoPreview = {
  so_ngay_catheter_cvc: number;
  so_ngay_sonde_tieu: number;
  so_ngay_tho_may: number;
  device_rows_considered: number;
};

export function previewMauSoFromRegistry(
  rows: DeviceRegistryRow[],
  rangeFrom: string,
  rangeTo: string,
  khoaId?: string | null,
): MauSoPreview {
  const filtered = khoaId
    ? rows.filter((r) => !r.khoa_id || r.khoa_id === khoaId)
    : rows;
  let cvc = 0;
  let foley = 0;
  let vent = 0;
  for (const r of filtered) {
    const n = countDeviceDaysInRange(r, rangeFrom, rangeTo);
    if (r.device_type === "CENTRAL_LINE") cvc += n;
    else if (r.device_type === "FOLEY") foley += n;
    else if (r.device_type === "VENTILATOR") vent += n;
  }
  return {
    so_ngay_catheter_cvc: cvc,
    so_ngay_sonde_tieu: foley,
    so_ngay_tho_may: vent,
    device_rows_considered: filtered.length,
  };
}

/** Midnight presence: one patient-day if present any part of calendar day at location — simplified stay overlap. */
export function countPatientDaysFromStay(input: {
  ngay_vao: string;
  ngay_ra?: string | null;
  rangeFrom: string;
  rangeTo: string;
}): number {
  const start = input.ngay_vao.slice(0, 10);
  const end = input.ngay_ra ? input.ngay_ra.slice(0, 10) : input.rangeTo.slice(0, 10);
  return clampRangeOverlap(start, end, input.rangeFrom, input.rangeTo);
}
