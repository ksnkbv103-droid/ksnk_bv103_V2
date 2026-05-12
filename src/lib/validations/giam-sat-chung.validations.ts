/**
 * Zod Validation Schemas — Giám sát Bảng kiểm chung (GSC)
 * 
 * Sử dụng trong Server Actions trước khi ghi dữ liệu vào DB.
 * Tham chiếu: AGENTS.md 5d (Zod Validation), Playbook 3a
 */
import { z } from "zod";

/** UUID tùy chọn — chuỗi rỗng "" được coi như null (form thường set "" khi user clear chọn). */
const optionalUuid = (msg: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().uuid(msg).nullable().optional(),
  );

// ============================================================
// Phiên giám sát (Session)
// ============================================================

export const gscSessionSchema = z.object({
  khoa_id: z.string().uuid("Khoa không hợp lệ"),
  khu_vuc_id: optionalUuid("Khu vực không hợp lệ"),
  nguoi_giam_sat_id: optionalUuid("Người giám sát không hợp lệ"),
  nhan_vien_id: optionalUuid("Nhân viên không hợp lệ"),
  nghe_nghiep_id: optionalUuid("Nghề nghiệp không hợp lệ"),
  bang_kiem_id: optionalUuid("Bảng kiểm không hợp lệ"),
  loai_bang_kiem: z.string().optional(),
  ten_bang_kiem: z.string().min(1, "Tên bảng kiểm không được trống").optional(),
  hinh_thuc_giam_sat: z.enum(["Tự giám sát", "Giám sát khách quan"]).optional(),
  cach_thuc_giam_sat: z.enum([
    "Giám sát trực tiếp tại chỗ",
    "Giám sát trực tiếp qua camera",
    "Giám sát lại qua camera",
  ]).optional(),
  doi_tuong_giam_sat: z.string().optional(),
  vi_tri: z.string().optional(),
  ngay_giam_sat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").nullable().optional(),
  /** Khung giờ phiên (bắt buộc khi giám sát lại qua camera). */
  thoi_gian_bat_dau: z.string().nullable().optional(),
  thoi_gian_ket_thuc: z.string().nullable().optional(),
  ghi_chu_chung: z.string().optional(),
  is_active: z.boolean().default(true),
  is_giam_sat_ca_nhan: z.boolean().optional(),
  /** Nhập tay tên đối tượng (không có hồ sơ mdm_nhan_su). */
  is_manual_nhan_vien: z.boolean().optional(),
  ten_manual_nhan_vien: z.string().optional(),
});

export type GscSessionInput = z.infer<typeof gscSessionSchema>;

// ============================================================
// Kết quả giám sát (Result)
// ============================================================

export const gscResultSchema = z.object({
  criterionId: z.string().uuid("Tiêu chí ID không hợp lệ"),
  value: z.enum(["DAT", "KHONG_DAT", "NA"], "Giá trị kết quả không hợp lệ"),
  note: z.string().nullable().optional(),
});

export type GscResultInput = z.infer<typeof gscResultSchema>;

// ============================================================
// Batch write: session + results
// ============================================================

export const gscSaveSessionSchema = z.object({
  session: gscSessionSchema,
  results: z.array(gscResultSchema).min(1, "Phải có ít nhất 1 kết quả giám sát"),
});

export type GscSaveSessionInput = z.infer<typeof gscSaveSessionSchema>;
