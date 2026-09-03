/** Tra cứu bảng kiểm theo giá trị lưu trong phiên (`ma_bk` hoặc UUID `id`). */

export type BangKiemRowLike = { id?: string; ma_bk?: string | null };

export function findBangKiemForSessionLoai(
  dbTemplates: BangKiemRowLike[],
  loaiBangKiem: unknown,
): BangKiemRowLike | undefined {
  const loai = String(loaiBangKiem ?? "").trim();
  if (!loai) return undefined;
  return (
    dbTemplates.find((t) => String(t.ma_bk ?? "").trim() === loai) ||
    dbTemplates.find((t) => String(t.id ?? "").trim() === loai)
  );
}

/** Picker (mẫu đang bật) trước; không có thì dùng bản lookup kể cả đã tắt (BK-5). */
export function pickBangKiemForGscView(opts: {
  dbTemplates: BangKiemRowLike[];
  loaiBangKiem: unknown;
  frozenBangKiemId?: string | null;
  sessionBangKiemId?: string | null;
  lookup?: BangKiemRowLike | null;
}): BangKiemRowLike | undefined {
  const frozenId = String(opts.frozenBangKiemId ?? "").trim();
  const sessionId = String(opts.sessionBangKiemId ?? "").trim();
  const fromPicker =
    findBangKiemForSessionLoai(opts.dbTemplates, opts.loaiBangKiem) ||
    (frozenId
      ? opts.dbTemplates.find((t) => String(t.id ?? "").trim() === frozenId)
      : undefined) ||
    (sessionId
      ? opts.dbTemplates.find((t) => String(t.id ?? "").trim() === sessionId)
      : undefined);
  return fromPicker ?? opts.lookup ?? undefined;
}

export function gscViewBangKiemLookupKeys(opts: {
  loaiBangKiem: unknown;
  frozenBangKiemId?: string | null;
  sessionBangKiemId?: string | null;
}): string[] {
  const keys = [
    String(opts.sessionBangKiemId ?? "").trim(),
    String(opts.frozenBangKiemId ?? "").trim(),
    String(opts.loaiBangKiem ?? "").trim(),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
