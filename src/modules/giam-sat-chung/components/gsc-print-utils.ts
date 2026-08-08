import { formatDateTimeVi, formatDateVi } from "@/lib/format-datetime-vi";

export function safeFormatNgay(ngay: unknown): string {
  if (ngay == null || ngay === "") return "—";
  return formatDateVi(String(ngay));
}

export function safeFormatDt(v: unknown): string {
  if (v == null || v === "") return "—";
  return formatDateTimeVi(String(v));
}
