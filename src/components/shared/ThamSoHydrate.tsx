"use client";

import { applyThamSo, type ThamSoMap } from "@/lib/analytics/supervision-thresholds";

/** Đặt ngưỡng đang áp dụng (từ DB, do root layout đọc) trước khi các màn hình con render. */
export function ThamSoHydrate({ values }: { values: ThamSoMap }) {
  applyThamSo(values);
  return null;
}
