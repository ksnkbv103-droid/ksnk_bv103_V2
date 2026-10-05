/**
 * Deep-link sửa phiên GSC: SSOT `?edit=<uuid>`; nhận thêm `?session=` (link cũ QLCV).
 */
export function pickGscEditSessionId(params: {
  edit?: string | string[] | null;
  session?: string | string[] | null;
}): string | null {
  const first = (v: string | string[] | null | undefined): string | null => {
    if (Array.isArray(v)) return String(v[0] ?? "").trim() || null;
    const s = String(v ?? "").trim();
    return s || null;
  };
  return first(params.edit) || first(params.session);
}
