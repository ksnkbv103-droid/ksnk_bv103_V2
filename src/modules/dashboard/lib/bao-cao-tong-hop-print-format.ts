import { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import { formatPercent1, formatPercent2 } from "@/lib/analytics/supervision-percent";
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

function signedPct(v: number, digits: 1 | 2): string {
  const body = digits === 2 ? formatPercent2(v) : formatPercent1(v);
  return v > 0 ? `+${body}` : body;
}

export function fmtDelta(v: number | null | undefined, digits: 1 | 2 = 1): string {
  if (v == null || !Number.isFinite(v)) return "— so với tuần trước";
  return `${signedPct(v, digits)} so với tuần trước`;
}

function shortDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d}-${m}`;
}

/** So kỳ cùng độ dài — tách khỏi Δ 2 tuần ISO. */
export function fmtKyTruocDelta(
  delta: number | null | undefined,
  tuNgay: string,
  denNgay: string,
  digits: 1 | 2 = 1,
): string {
  if (delta == null || !Number.isFinite(delta)) return "";
  return `vs kỳ trước (${shortDayMonth(tuNgay)}→${shortDayMonth(denNgay)}): ${signedPct(delta, digits)}`;
}
