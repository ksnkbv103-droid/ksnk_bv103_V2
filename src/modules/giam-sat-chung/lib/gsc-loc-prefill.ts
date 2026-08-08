export type GscLocPrefill = { kind: "khoa" | "khu"; ma: string };

/** Parse `?loc=khoa|khu&ma=` — bỏ qua khi đang sửa phiên (`edit`). */
export function parseGscLocPrefill(params: {
  loc?: string | string[] | null;
  ma?: string | string[] | null;
  edit?: string | string[] | null;
}): GscLocPrefill | null {
  const pick = (v: string | string[] | null | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? null;
  if (pick(params.edit)) return null;
  const loc = String(pick(params.loc) || "")
    .trim()
    .toLowerCase();
  const ma = pick(params.ma);
  if (!ma || (loc !== "khoa" && loc !== "khu")) return null;
  return { kind: loc, ma };
}
