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
