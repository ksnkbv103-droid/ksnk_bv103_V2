/**
 * Zod — ghi bảng kiểm (GSC). Kiểm hình dạng đầu vào trước khi chạm DB; luật nghiệp vụ
 * (áp dụng/bắt buộc, cách tính điểm) vẫn do `bang-kiem-ap-dung` và `*-gsc-fields` đảm nhiệm.
 */
import { z } from "zod";
import { masterRequiredIdSchema, masterRowIdSchema } from "./master-data-write.validations";

const text = (max: number, msg: string) => z.string().trim().max(max, msg);

export const bangKiemIdSchema = z.object({ bangKiemId: masterRequiredIdSchema });

/** Phiếu bảng kiểm lưu từ form: mã và tên bắt buộc (cột NOT NULL ở DB). */
export const saveBangKiemSchema = z.object({
  id: masterRowIdSchema.optional(),
  ma_bk: text(60, "Mã bảng kiểm quá dài (tối đa 60 ký tự).").min(1, "Nhập mã bảng kiểm."),
  ten_bang_kiem: text(300, "Tên bảng kiểm quá dài (tối đa 300 ký tự).").min(2, "Nhập tên bảng kiểm."),
  mo_ta: text(4000, "Mô tả quá dài (tối đa 4000 ký tự).").nullable().optional(),
});

export const saveTieuChiSchema = z.object({
  bangKiemId: masterRequiredIdSchema,
  noi_dung: text(2000, "Nội dung tiêu chí quá dài (tối đa 2000 ký tự).").min(1, "Nhập nội dung tiêu chí."),
  ma_tc: text(60, "Mã tiêu chí quá dài.").nullable().optional(),
  ghi_chu: text(2000, "Ghi chú quá dài (tối đa 2000 ký tự).").nullable().optional(),
});

export const deleteTieuChiSchema = z.object({
  bangKiemId: masterRequiredIdSchema.optional(),
  tcId: z.string().trim().min(1, "Thiếu mã tiêu chí.").max(100, "Mã tiêu chí không hợp lệ."),
});

export const importTieuChisSchema = z.object({
  bangKiemId: masterRequiredIdSchema,
  newCriteria: z
    .array(z.record(z.string(), z.unknown()))
    .max(1000, "Mỗi lần nhập tối đa 1000 tiêu chí."),
});

export const deleteMultipleTieuChisSchema = z.object({
  ids: z
    .array(z.string().trim().min(1).max(100))
    .max(500, "Mỗi lần xóa tối đa 500 tiêu chí."),
});
