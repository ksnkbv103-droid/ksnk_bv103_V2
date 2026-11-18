import { addDays } from "../../nkbv-shared-timeline";

/** Ngày nhập khu nội trú dùng chung cho mọi ca (Manual: hd1). */
export const ADMISSION = "2026-03-01";

/** Manual: hd 1 = ngày nhập, ngày trước = -1, -2 (không có ngày 0). */
export function hdToDate(hd: number, admission = ADMISSION): string {
  return addDays(admission, hd < 0 ? hd : hd - 1);
}

/** Ngược lại: ngày lịch → hd Manual. */
export function dateToHd(date: string, admission = ADMISSION): number {
  const n = Math.round((Date.parse(date) - Date.parse(admission)) / 86400000);
  return n < 0 ? n : n + 1;
}

/** "3/29" → "2026-03-29" (ca Ch.02 transfer, Ch.07). */
export function mdToDate(md: string, year = 2026): string {
  const [m, d] = md.split("/").map(Number);
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
