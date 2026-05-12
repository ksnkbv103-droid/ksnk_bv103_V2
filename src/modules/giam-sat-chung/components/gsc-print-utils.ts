import { format } from "date-fns";

export function safeFormatNgay(ngay: unknown): string {
  if (ngay == null || ngay === "") return "—";
  try {
    return format(new Date(String(ngay)), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

export function safeFormatDt(v: unknown): string {
  if (v == null || v === "") return "—";
  try {
    return new Date(String(v)).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}
