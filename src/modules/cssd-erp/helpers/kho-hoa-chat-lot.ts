/** Chuẩn hóa khóa lô/hạn để khớp nhập–xuất / view tồn. */
export function normalizeMaLo(raw?: string | null): string | null {
  const t = String(raw ?? "").trim();
  return t.length ? t : null;
}

export function normalizeHanIso(raw?: string | null): string | null {
  if (raw == null || raw === "") return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function sameLotKey(
  a: { ma_lo?: string | null; han_su_dung?: string | null },
  b: { ma_lo?: string | null; han_su_dung?: string | null },
): boolean {
  return normalizeMaLo(a.ma_lo) === normalizeMaLo(b.ma_lo) && normalizeHanIso(a.han_su_dung) === normalizeHanIso(b.han_su_dung);
}
