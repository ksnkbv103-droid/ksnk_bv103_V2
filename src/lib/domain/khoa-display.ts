/**
 * SSOT hiển thị khoa toàn app.
 * - Ô tìm / lọc: `Mã | Tên` (vd. A05 | Khoa truyền nhiễm)
 * - Bảng / biểu đồ (trừ sổ danh mục khoa): chỉ mã; thiếu mã → tên
 */

export type KhoaDisplayInput = {
  ma_khoa?: string | null;
  ten_khoa?: string | null;
  /** Alias dùng ở chart/mapper cũ */
  ten?: string | null;
  ma?: string | null;
  ma_danh_muc?: string | null;
  ten_danh_muc?: string | null;
};

function pickMa(row: KhoaDisplayInput): string {
  return String(row.ma_khoa ?? row.ma ?? row.ma_danh_muc ?? "").trim();
}

function pickTen(row: KhoaDisplayInput): string {
  return String(row.ten_khoa ?? row.ten ?? row.ten_danh_muc ?? "").trim();
}

/** Ô chọn / tìm kiếm: `A05 | Khoa truyền nhiễm`. Không có mã → chỉ tên. */
export function formatKhoaPickerLabel(row: KhoaDisplayInput): string {
  const ma = pickMa(row);
  const ten = pickTen(row);
  if (ma && ten) return `${ma} | ${ten}`;
  if (ma) return ma;
  return ten || "—";
}

/** Bảng / chart / in / xuất: chỉ mã; thiếu mã → tên. */
export function formatKhoaCompactLabel(row: KhoaDisplayInput): string {
  const ma = pickMa(row);
  if (ma) return ma;
  return pickTen(row) || "—";
}

/**
 * Lấy mã từ label option cũ/mới:
 * - `A05 | Khoa…`
 * - `A05 - Khoa…`
 * - `[A05] Khoa…`
 * - `Khoa… (A05)`
 */
export function parseMaFromKhoaOptionLabel(label: string): string | null {
  const raw = String(label || "").trim();
  if (!raw) return null;
  const pipe = raw.match(/^([A-Za-z0-9][A-Za-z0-9_-]*)\s+\|\s+/);
  if (pipe) return pipe[1].toUpperCase();
  const dash = raw.match(/^([A-Za-z0-9][A-Za-z0-9_-]*)\s+-\s+/);
  if (dash) return dash[1].toUpperCase();
  const bracket = raw.match(/^\[([^\]]+)\]/);
  if (bracket) return bracket[1].trim().toUpperCase();
  const paren = raw.match(/\(([A-Za-z0-9][A-Za-z0-9_-]*)\)\s*$/);
  if (paren) return paren[1].toUpperCase();
  return null;
}
