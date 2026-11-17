/** Cấp phát nhiều bộ cho một nơi nhận: chuẩn hóa danh sách mã + tóm tắt kết quả từng bộ (thuần, không I/O). */

export const CAP_PHAT_BATCH_MAX = 100;

export type CapPhatBatchItem =
  | { maQr: string; ok: true; tenBo: string; quyTrinhId: string; daCapTruoc: boolean }
  | { maQr: string; ok: false; error: string };

/** Trim, viết hoa, bỏ trống và trùng (giữ thứ tự quét đầu tiên). */
export function normalizeCapPhatCodes(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const c = String(r || "").trim().toUpperCase();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

export function summarizeCapPhatBatch(items: readonly CapPhatBatchItem[]) {
  const ok = items.filter((i) => i.ok).length;
  return { total: items.length, ok, failed: items.length - ok };
}
