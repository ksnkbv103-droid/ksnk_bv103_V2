/**
 * Zod — ghi Khoa/Phòng (QT-018). Chỉ kiểm HÌNH DẠNG đầu vào của form; quy tắc nghiệp vụ
 * (khối khoa thuộc KHOI_KHOA, mã CDC, số âm → 0) vẫn do `saveKhoaPhongAction` đảm nhiệm.
 * Tách file riêng vì file `"use server"` chỉ được export hàm async.
 */
import { z } from "zod";
import { MASTER_MAX_STRING_LEN, masterRowIdSchema } from "@/lib/validations/master-data-write.validations";

const THIEU_MA_TEN = "Thiếu mã hoặc tên khoa phòng.";

/** Số lượng từ form: number hoặc chuỗi số; `normalizeNonNegativeNumber` ép về số nguyên ≥ 0 sau đó. */
const soLuongSchema = z.union([z.number(), z.string().max(20), z.null()]).optional();

export const khoaPhongSaveSchema = z.object({
  id: masterRowIdSchema.nullish(),
  /** `mdm_dm_khoa_phong.ma_khoa` là varchar(50). */
  ma_danh_muc: z.string(THIEU_MA_TEN).trim().min(1, THIEU_MA_TEN).max(50, "Mã khoa tối đa 50 ký tự."),
  ten_danh_muc: z.string(THIEU_MA_TEN).trim().min(1, THIEU_MA_TEN).max(255, "Tên khoa phòng tối đa 255 ký tự."),
  khoi_id: z.string().max(100).nullish(),
  mo_ta_chuc_nang: z.string().max(MASTER_MAX_STRING_LEN, "Mô tả chức năng quá dài.").nullish(),
  so_bac_si: soLuongSchema,
  so_dieu_duong: soLuongSchema,
  so_giuong_benh_thuong: soLuongSchema,
  so_giuong_cap_cuu: soLuongSchema,
  is_active: z.boolean().optional(),
  /** `specs` là jsonb: chỉ nhận object thường (không mảng, không chuỗi). */
  specs: z.record(z.string().max(100), z.unknown()).nullish(),
  cdc_location_code: z.string().max(100).nullish(),
});

export type KhoaPhongSaveInput = z.infer<typeof khoaPhongSaveSchema>;
