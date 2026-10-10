/**
 * Zod — ghi danh mục (master data). Chặn dữ liệu sai hình dạng trước khi chạm DB:
 * id không phải UUID, payload không phải object thường, chuỗi quá dài, danh sách id khổng lồ.
 * Quy tắc riêng từng bảng (mã khoa, thiết bị…) vẫn do validator của bảng đó đảm nhiệm — ở đây chỉ kiểm hình dạng chung.
 */
import { z } from "zod";
import { parseOrFirstError } from "./tai-khoan-nhan-su.validations";

export const MASTER_MAX_STRING_LEN = 4000;
export const MASTER_MAX_BATCH_IDS = 200;

/** `""` = tạo mới; còn lại phải là UUID. */
export const masterRowIdSchema = z.union([
  z.literal(""),
  z.string().trim().uuid("Mã bản ghi không hợp lệ."),
]);

export const masterRequiredIdSchema = z.string().trim().uuid("Mã bản ghi không hợp lệ.");

const looksTooLong = (v: unknown): boolean =>
  typeof v === "string" ? v.length > MASTER_MAX_STRING_LEN : false;

/** Payload ghi bảng danh mục: object thường, không rỗng, mọi chuỗi ≤ 4000 ký tự. */
export const masterPayloadSchema = z
  .record(z.string().min(1).max(100), z.unknown())
  .refine((o) => Object.keys(o).length > 0, "Chưa có dữ liệu để lưu.")
  .refine((o) => !Object.values(o).some(looksTooLong), `Có trường dài quá ${MASTER_MAX_STRING_LEN} ký tự.`);

export const masterUpsertSchema = z.object({
  tableName: z.string().trim().min(1, "Thiếu tên bảng danh mục."),
  id: masterRowIdSchema,
  payload: masterPayloadSchema,
});

export const masterToggleSchema = z.object({
  tableName: z.string().trim().min(1, "Thiếu tên bảng danh mục."),
  id: masterRequiredIdSchema,
  currentStatus: z.boolean(),
});

export const masterSoftDeleteSchema = z.object({
  tableName: z.string().trim().min(1, "Thiếu tên bảng danh mục."),
  id: masterRequiredIdSchema,
});

export const masterSoftDeleteManySchema = z.object({
  tableName: z.string().trim().min(1, "Thiếu tên bảng danh mục."),
  ids: z
    .array(masterRequiredIdSchema)
    .min(1, "Chưa chọn bản ghi nào.")
    .max(MASTER_MAX_BATCH_IDS, `Mỗi lần chỉ thao tác tối đa ${MASTER_MAX_BATCH_IDS} bản ghi.`),
});

export { parseOrFirstError };
