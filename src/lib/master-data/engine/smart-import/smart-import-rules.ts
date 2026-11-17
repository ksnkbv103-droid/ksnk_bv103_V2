import { z } from "zod";

/** Trần số dòng một lần import (chống payload quá lớn). */
export const SMART_IMPORT_MAX_ROWS = 5000;

const rowSchema = z.record(z.string(), z.unknown());

/** Payload dòng: mảng object, 1..SMART_IMPORT_MAX_ROWS dòng. */
export const smartImportRowsSchema = z.array(rowSchema).min(1).max(SMART_IMPORT_MAX_ROWS);

/** BOM: số lượng nếu có phải là số nguyên ≥ 1 (ô trống = 1). */
export const bomRowQtySchema = z.preprocess(
  (v) => (v === undefined || v === null || String(v).trim() === "" ? 1 : v),
  z.coerce.number().int().min(1),
);

/** Số lượng BOM theo file (THAY THẾ, không cộng dồn). Không hợp lệ → 1. */
export function bomReplaceQty(raw: unknown): number {
  const r = bomRowQtySchema.safeParse(raw);
  return r.success ? r.data : 1;
}

/** Gộp specs: giữ khóa cũ, giá trị từ file đè khóa trùng, luôn gắn khóa định danh. */
export function mergeImportSpecs(
  existing: unknown,
  incoming: unknown,
  uniqueKey: string,
  code: string,
): Record<string, unknown> {
  const asObj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  return { ...asObj(existing), ...asObj(incoming), [uniqueKey]: code };
}

/** Id giữ chỗ cho bộ cha chưa tồn tại khi dry-run (không ghi DB). */
export function dryRunParentPlaceholderId(ma: string): string {
  return `dry-run:${ma}`;
}
