/**
 * Ngày–khoa / ngày–dụng cụ trên lưới BA — logic thuần.
 */

import type { DeviceCriteriaKey } from "./nkbv-criteria-matrix";
import {
  DEVICE_CRITERIA_META,
  emptyBaDeviceByDate,
  type BaDeviceByDate,
} from "./nkbv-ba-device-timeline";
import type { DepartmentStay } from "../types/nkbv-verification";

export type NkbvDungCuLoai = "CVC" | "VENT" | "FOLEY";

export type NkbvNgayKhoaRow = {
  ngay_lich: string;
  khoa_id: string;
};

export type NkbvNgayDungCuRow = {
  id?: string;
  ngay_lich: string;
  loai_dung_cu: NkbvDungCuLoai;
};

/** Timestamp ngày lịch Việt Nam — tránh lệch HD vì UTC. */
export function nkbvVnDateStartIso(dateYmd: string): string {
  const d = String(dateYmd || "").slice(0, 10);
  return `${d}T00:00:00+07:00`;
}

export function criteriaKeyToDungCuLoai(
  key: string | null | undefined,
): NkbvDungCuLoai | null {
  if (key === "device_central_line") return "CVC";
  if (key === "device_ventilator") return "VENT";
  if (key === "device_foley") return "FOLEY";
  return null;
}

export function dungCuLoaiToCriteriaKey(loai: NkbvDungCuLoai): DeviceCriteriaKey {
  if (loai === "CVC") return "device_central_line";
  if (loai === "VENT") return "device_ventilator";
  return "device_foley";
}

export function dungCuLoaiToRegistryType(
  loai: NkbvDungCuLoai,
): "CENTRAL_LINE" | "VENTILATOR" | "FOLEY" {
  if (loai === "CVC") return "CENTRAL_LINE";
  if (loai === "VENT") return "VENTILATOR";
  return "FOLEY";
}

export function khoaIdByDateMap(rows: NkbvNgayKhoaRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const d = String(r.ngay_lich || "").slice(0, 10);
    if (d) out[d] = String(r.khoa_id);
  }
  return out;
}

/** Số ngày lịch đã tích một loại dụng cụ, trong khoảng nằm viện (kể cả hai đầu). */
export function countDungCuCalendarDays(
  rows: NkbvNgayDungCuRow[],
  loai: NkbvDungCuLoai,
  stayFrom: string | null | undefined,
  stayTo: string | null | undefined,
): number {
  const from = String(stayFrom || "").slice(0, 10);
  const to = String(stayTo || "").slice(0, 10);
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.loai_dung_cu !== loai) continue;
    const day = String(r.ngay_lich || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (from && day < from) continue;
    if (to && day > to) continue;
    seen.add(day);
  }
  return seen.size;
}

export function deviceDaysToByDate(rows: NkbvNgayDungCuRow[]): BaDeviceByDate {
  const out = emptyBaDeviceByDate();
  for (const r of rows) {
    const d = String(r.ngay_lich || "").slice(0, 10);
    const key = dungCuLoaiToCriteriaKey(r.loai_dung_cu);
    const meta = DEVICE_CRITERIA_META[key];
    const bucket = out[meta.bucket];
    if (!bucket[d]) bucket[d] = [];
    if (!bucket[d].some((x) => x.key === key)) {
      bucket[d].push({
        id: r.id || `${r.loai_dung_cu}:${d}`,
        ngay: d,
        key,
        label: meta.label,
      });
    }
  }
  return out;
}

/** Chuỗi ngày liền → khoảng đặt–rút. */
export function dungCuDatRutIslands(
  dates: string[],
): Array<{ ngay_dat: string; ngay_rut: string }> {
  const sorted = [...new Set(dates.map((x) => x.slice(0, 10)))].sort();
  if (!sorted.length) return [];
  const islands: Array<{ ngay_dat: string; ngay_rut: string }> = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    const prevT = Date.parse(`${prev}T00:00:00Z`);
    const curT = Date.parse(`${cur}T00:00:00Z`);
    const gap = (curT - prevT) / 86400000;
    if (gap === 1) {
      prev = cur;
      continue;
    }
    islands.push({ ngay_dat: start, ngay_rut: prev });
    start = cur;
    prev = cur;
  }
  islands.push({ ngay_dat: start, ngay_rut: prev });
  return islands;
}

/** Khoa trên ngày sự kiện; nếu trống thì ngày trước gần nhất. */
export function khoaIdOnOrBefore(
  byDate: Record<string, string>,
  eventDate: string,
): string | null {
  const d = eventDate.slice(0, 10);
  if (byDate[d]) return byDate[d];
  const keys = Object.keys(byDate)
    .filter((k) => k <= d)
    .sort();
  return keys.length ? byDate[keys[keys.length - 1]] : null;
}

export function locationDaysToTreatmentHistory(
  rows: NkbvNgayKhoaRow[],
  khoaLabel: (id: string) => { ma_khoa?: string; ten_khoa?: string },
): DepartmentStay[] {
  const sorted = [...rows]
    .map((r) => ({ ngay: r.ngay_lich.slice(0, 10), khoa_id: r.khoa_id }))
    .filter((r) => r.ngay && r.khoa_id)
    .sort((a, b) => a.ngay.localeCompare(b.ngay));
  if (!sorted.length) return [];
  const stays: DepartmentStay[] = [];
  let khoaId = sorted[0].khoa_id;
  let ngayVao = sorted[0].ngay;
  let prev = sorted[0].ngay;
  const flush = (ngayRa: string) => {
    const lab = khoaLabel(khoaId);
    stays.push({
      khoa_id: khoaId,
      ma_khoa: lab.ma_khoa,
      ten_khoa: lab.ten_khoa || khoaId,
      ngay_vao: ngayVao,
      ngay_ra: ngayRa,
    });
  };
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    const prevT = Date.parse(`${prev}T00:00:00Z`);
    const curT = Date.parse(`${cur.ngay}T00:00:00Z`);
    const consecutive = (curT - prevT) / 86400000 === 1;
    if (cur.khoa_id === khoaId && consecutive) {
      prev = cur.ngay;
      continue;
    }
    flush(prev);
    khoaId = cur.khoa_id;
    ngayVao = cur.ngay;
    prev = cur.ngay;
  }
  flush(prev);
  return stays;
}

export function stripCopiedStayFieldsFromVerification(
  vd: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next = { ...(vd || {}) };
  delete next.treatment_history;
  delete next.device_placed_date;
  delete next.device_removed_date;
  return next;
}

export function eventDateFromVerification(
  vd: Record<string, unknown> | null | undefined,
  fallback: string | null,
): string | null {
  const metrics =
    vd?.cdc_metrics && typeof vd.cdc_metrics === "object"
      ? (vd.cdc_metrics as Record<string, unknown>)
      : vd || {};
  const raw = metrics.doe || metrics.DOE || metrics.calculated_doe || fallback;
  const d = String(raw || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}
