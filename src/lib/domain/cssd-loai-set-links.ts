/** Liên kết loại dụng cụ ↔ bộ: cùng nguồn với sổ chuẩn, không suy từ danh sách cắt trang. */

export type BoDungCuChuaRef = {
  id: string;
  ma_bo: string | null;
  ten_bo: string | null;
  so_luong?: number | null;
};

export function soLuongTrongBo(soLuongTong: number, soLuongKho: number): number {
  const tong = Math.max(0, Math.floor(Number(soLuongTong) || 0));
  const kho = Math.max(0, Math.floor(Number(soLuongKho) || 0));
  return Math.max(0, tong - kho);
}

function parseJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeBoDungCuChua(raw: unknown): BoDungCuChuaRef[] {
  const seen = new Set<string>();
  const out: BoDungCuChuaRef[] = [];
  for (const item of parseJsonArray(raw)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = String(rec.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const soLuong = rec.so_luong == null || rec.so_luong === "" ? null : Number(rec.so_luong);
    out.push({
      id,
      ma_bo: rec.ma_bo == null || rec.ma_bo === "" ? null : String(rec.ma_bo),
      ten_bo: rec.ten_bo == null || rec.ten_bo === "" ? null : String(rec.ten_bo),
      so_luong: soLuong != null && Number.isFinite(soLuong) ? soLuong : null,
    });
  }
  return out;
}

export function boIdsFromChua(refs: BoDungCuChuaRef[]): string[] {
  return refs.map((r) => r.id).filter(Boolean);
}
