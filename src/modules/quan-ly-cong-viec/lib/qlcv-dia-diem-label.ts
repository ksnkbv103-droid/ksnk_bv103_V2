import { formatKhoaCompactLabel, parseMaFromKhoaOptionLabel } from "@/lib/domain/khoa-display";
import type { QlcvSelectOption } from "./qlcv-form-options";

/** Nhãn địa điểm: nối tất cả khoa trong `ids`; không có mảng thì rơi về khoa đơn cũ. */
export function formatQlcvDiaDiemKhoaLabels(
  ids: string[] | null | undefined,
  options: QlcvSelectOption[],
  fallback?: { ma_khoa?: string | null; ten_khoa?: string | null },
): string {
  const parts = (ids ?? [])
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is QlcvSelectOption => Boolean(o))
    .map((o) => formatKhoaCompactLabel({ ma_khoa: parseMaFromKhoaOptionLabel(o.label), ten_khoa: o.label }));
  if (parts.length) return parts.join(", ");
  return fallback ? formatKhoaCompactLabel(fallback) : "—";
}
