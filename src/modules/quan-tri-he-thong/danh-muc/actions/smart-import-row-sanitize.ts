/**
 * Chuẩn hóa giá trị ô Excel → khớp Postgres (ngày serial, timestamp, bỏ object lồng).
 * Gọi trên server trước insert/update smart-import.
 */

const DATE_ONLY_FIELDS = new Set([
  "ngay_sinh",
  "han_su_dung",
  "ngay_dua_vao_su_dung",
  "ngay_bao_tri_gan_nhat",
  "ngay_bao_tri_tiep_theo",
]);

const TIMESTAMP_FIELDS = new Set(["ngay_kiem_ke_gan_nhat"]);

function excelSerialToUtcMs(serial: number): number {
  const epoch = Date.UTC(1899, 11, 30);
  return epoch + serial * 86400000;
}

function coerceDateOnly(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 20000 && v < 120000) return new Date(excelSerialToUtcMs(v)).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return undefined;
}

function coerceTimestamp(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 20000 && v < 120000) return new Date(excelSerialToUtcMs(v)).toISOString();
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  const d = Date.parse(s);
  if (!Number.isNaN(d)) return new Date(d).toISOString();
  return undefined;
}

/** Chuẩn hóa ngày/giờ từ Excel cho một dòng import. */
export function normalizeImportedRowTypedValues(_tableName: string, row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (DATE_ONLY_FIELDS.has(k)) {
      const iso = coerceDateOnly(v);
      if (iso !== undefined) out[k] = iso;
    } else if (TIMESTAMP_FIELDS.has(k)) {
      const iso = coerceTimestamp(v);
      if (iso !== undefined) out[k] = iso;
    } else if (k === "gioi_tinh" && typeof v === "number") {
      out[k] = String(v);
    }
  }
  return out;
}

/** Bỏ cột không phảu scalar (join PostgREST), undefined, và kỹ thuật. */
export function sanitizeSmartImportRowPayload(row: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "__excel_row__" || k.startsWith("__")) continue;
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) continue;
    o[k] = v;
  }
  return o;
}
