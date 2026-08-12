/**
 * Màu ô theo cửa sổ CDC — cùng palette bảng ngang cũ (cellTone).
 * Dùng theo **cột** (IPW-LS / RIT / SBAP / Index / DOE), không tô cả hàng.
 */

export type BaDayToneKind = "iwp" | "rit" | "sbap" | "doe" | "index" | "none";

export function baCellToneClass(kind: BaDayToneKind): string {
  switch (kind) {
    case "doe":
      return "bg-red-300 font-bold text-red-950";
    case "index":
      return "bg-amber-200 font-semibold text-amber-950";
    case "iwp":
      return "bg-rose-100";
    case "sbap":
      return "bg-sky-100";
    case "rit":
      return "bg-emerald-100";
    default:
      return "bg-white";
  }
}

/** @deprecated alias — dùng baCellToneClass (highlight theo cột). */
export const baDayToneClass = baCellToneClass;

export function resolveBaDayTone(input: {
  date: string;
  indexDate?: string | null;
  nsk?: string | null;
  iwpDates?: Set<string> | string[];
  ritDates?: Set<string> | string[];
  sbapDates?: Set<string> | string[];
}): BaDayToneKind {
  const d = input.date.slice(0, 10);
  const has = (set?: Set<string> | string[]) => {
    if (!set) return false;
    if (set instanceof Set) return set.has(d);
    return set.map((x) => x.slice(0, 10)).includes(d);
  };
  if (input.nsk && input.nsk.slice(0, 10) === d) return "doe";
  if (input.indexDate && input.indexDate.slice(0, 10) === d) return "index";
  if (has(input.iwpDates)) return "iwp";
  if (has(input.sbapDates)) return "sbap";
  if (has(input.ritDates)) return "rit";
  return "none";
}
