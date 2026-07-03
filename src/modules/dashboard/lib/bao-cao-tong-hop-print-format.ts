import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { formatBaoCaoIsoDateVi } from "./bao-cao-tong-hop-core";

export const pickLabels = (ids: string[], options: MultiSelectOption[]) =>
  ids?.length && ids.length < options?.length
    ? options
        .filter((o) => ids.includes(o.id))
        .map((o) => o.label)
        .join(", ")
    : "Tất cả";

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtIsoDate(iso: string): string {
  return formatBaoCaoIsoDateVi(iso);
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v}%`;
}

export function fmtDelta(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "— so với tuần trước";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}% so với tuần trước`;
}
