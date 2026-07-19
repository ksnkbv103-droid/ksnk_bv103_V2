import type { BomItem } from "@/lib/domain/cssd-packaging-rules";
import {
  normalizeSpauldingForMaster,
  normalizeSterileMethodForMaster,
} from "@/lib/master-data/cssd-loai-dung-cu-map";

export type QuyTrinhBomLine = {
  line_key: string;
  chi_tiet_id: string | null;
  ten_dung_cu_le: string;
  so_luong_ke_hoach: number;
  so_luong_thuc_te: number;
};

export function bomLineKeyFromTemplate(
  chiTietId: string | null | undefined,
  ten: string,
  index: number,
): string {
  const id = String(chiTietId || "").trim();
  if (id) return id;
  const slug = ten
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `line-${index}-${slug || "item"}`;
}

export function parseBomLinesFromMetadata(metadata: unknown): QuyTrinhBomLine[] {
  const raw = (metadata as { bom_lines?: unknown } | null)?.bom_lines;
  if (!Array.isArray(raw)) return [];
  const out: QuyTrinhBomLine[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as Record<string, unknown>;
    const ten = String(row.ten_dung_cu_le || "").trim() || "—";
    const chiTietId = row.chi_tiet_id ? String(row.chi_tiet_id) : null;
    out.push({
      line_key: String(row.line_key || bomLineKeyFromTemplate(chiTietId, ten, i)),
      chi_tiet_id: chiTietId,
      ten_dung_cu_le: ten,
      so_luong_ke_hoach: Number(row.so_luong_ke_hoach ?? 1) || 1,
      so_luong_thuc_te: Number(row.so_luong_thuc_te ?? row.so_luong_ke_hoach ?? 1) || 0,
    });
  }
  return out;
}

export function mergeBomLineQuantities(
  lines: QuyTrinhBomLine[],
  updates: Array<{ line_key: string; so_luong_thuc_te: number }>,
): QuyTrinhBomLine[] {
  const map = new Map(updates.map((u) => [u.line_key, u.so_luong_thuc_te]));
  return lines.map((line) => {
    const qty = map.get(line.line_key);
    if (qty == null) return line;
    return { ...line, so_luong_thuc_te: qty };
  });
}

/** SSOT Spaulding: dùng chung master loại dụng cụ (alias UI + mã chuẩn). */
export function normalizeSpaulding(value: unknown): BomItem["phan_loai_spaulding"] {
  return normalizeSpauldingForMaster(value);
}

/** SSOT PP tiệt khuẩn: dùng chung master («Hơi nước» → STEAM_134, …). */
export function normalizeSteamMethod(value: unknown): BomItem["phuong_phap_tiet_khuan_chi_dinh"] {
  return normalizeSterileMethodForMaster(value);
}

export function unwrapLoaiDungCuRelation(rel: unknown): Record<string, unknown> | undefined {
  if (!rel) return undefined;
  if (Array.isArray(rel)) return (rel[0] as Record<string, unknown>) || undefined;
  return rel as Record<string, unknown>;
}
