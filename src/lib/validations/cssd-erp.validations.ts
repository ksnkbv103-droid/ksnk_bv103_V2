import { z } from "zod";

/**
 * Schema cho việc tạo mẻ tiệt khuẩn mới
 */
export const createSterilizationBatchSchema = z.object({
  machineId: z.string().uuid("ID máy không hợp lệ"),
  nguoiLoad: z.string().min(2, "Tên người load quá ngắn"),
});

/**
 * Schema cho việc thêm quy trình vào mẻ
 */
export const addQuyTrinhToBatchSchema = z.object({
  activeMeId: z.string().uuid("ID mẻ không hợp lệ"),
  code: z.string().min(3, "Mã QR không hợp lệ"),
});

/**
 * Schema cho việc kết thúc mẻ tiệt khuẩn
 */
export const finishSterilizationBatchSchema = z.object({
  activeMeId: z.string().uuid("ID mẻ không hợp lệ"),
  maLo: z.string().min(1, "Thiếu mã lô"),
  quyTrinhIds: z.array(z.string().uuid()),
  isPass: z.boolean(),
  nguoiUnload: z.string().min(2, "Tên người dỡ quá ngắn"),
  nhietDo: z.string().optional().default(""),
  testBI: z.string().optional().default(""),
  testCI: z.string().optional().default(""),
  testBD: z.string().optional().default(""),
});

/**
 * Schema cho từng dòng dữ liệu Import CSSD
 */
export const cssdImportRowSchema = z.object({
  ma_vach_qr: z.string().min(1, "Thiếu mã vạch QR"),
  trang_thai_hien_tai: z.string().optional().nullable(),
  tinh_trang: z.string().optional().nullable(),
  han_su_dung: z.string().optional().nullable(),
  lo_tiet_khuan_id: z.string().optional().nullable(),
  is_red_alert: z.union([z.boolean(), z.string(), z.number()]).optional().nullable(),
});
