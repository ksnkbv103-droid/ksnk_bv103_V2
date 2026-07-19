/**
 * Zod Validation Schemas — Giám sát Vệ sinh tay (VST)
 *
 * Sử dụng trong Server Actions trước khi ghi dữ liệu vào DB.
 * Tham chiếu: AGENTS.md 5d (Zod Validation)
 */
import { z } from "zod";

/** UUID bắt buộc — chuỗi rỗng "" coi như thiếu (form thường set "" khi chưa chọn). */
const requiredUuid = (msgMissing: string, msgInvalid: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string({ required_error: msgMissing }).uuid(msgInvalid),
  );

/** UUID tùy chọn — chuỗi rỗng "" → null. */
const optionalUuid = (msg: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().uuid(msg).nullable().optional(),
  );

// ============================================================
// Quan sát VST (một hành động rửa tay)
// ============================================================

const vstOpportunitySchema = z.object({
  thoi_diems: z.array(z.string()).min(1, "Phải có ít nhất 1 thời điểm"),
  hanh_dong: z.string().min(1, "Hành động không được trống"),
  dung_ky_thuat: z.boolean().nullable().optional(),
  du_thoi_gian: z.boolean().nullable().optional(),
  co_deo_gang: z.boolean().nullable().optional(),
  thoi_gian_ghi_nhan: z.string().optional(),
});

const vstObservationSchema = z.object({
  khoa_id: z.string().uuid("Khoa không hợp lệ"),
  nhan_vien_id: optionalUuid("Nhân viên không hợp lệ"),
  ten_nhan_vien_ngoai: z.string().optional(),
  khu_vuc_id: optionalUuid("Khu vực không hợp lệ"),
  khu_vuc: z.string().optional(),
  vi_tri: z.string().optional(),
  /** Nghề nghiệp đối tượng giám sát — bắt buộc để thống kê «Theo đối tượng (nghề)» không còn «Không rõ». */
  nghe_nghiep_id: requiredUuid("Nghề nghiệp là bắt buộc", "Nghề nghiệp không hợp lệ"),
  nghe_nghiep: z.string().optional(),
  ngay_giam_sat: z.string().optional(),
  opportunities: z.array(vstOpportunitySchema).min(1, "Phải có ít nhất 1 cơ hội"),
});

// ============================================================
// Phiên giám sát VST (Session)
// ============================================================

const vstSessionSchema = z.object({
  khoa_id: z.string().uuid("Khoa không hợp lệ"),
  khu_vuc_id: z.string().uuid("Khu vực không hợp lệ").nullable().optional(),
  nguoi_giam_sat_id: z.string().uuid("Người giám sát không hợp lệ").nullable().optional(),
  ngay_giam_sat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD"),
  vi_tri: z.string().optional(),
  hinh_thuc_id: z.string().uuid("Hình thức giám sát không hợp lệ").nullable().optional(),
  cach_thuc_id: z.string().uuid("Cách thức giám sát không hợp lệ").nullable().optional(),
  thoi_gian_bat_dau: z.string().nullable().optional(),
  thoi_gian_ket_thuc: z.string().nullable().optional(),
  ghi_chu: z.string().optional(),
  is_active: z.boolean().default(true),
});

// ============================================================
// Batch: session + observations
// ============================================================

export const vstSaveSessionSchema = z.object({
  session: vstSessionSchema,
  observations: z.array(vstObservationSchema).min(1, "Phải có ít nhất 1 quan sát"),
});
