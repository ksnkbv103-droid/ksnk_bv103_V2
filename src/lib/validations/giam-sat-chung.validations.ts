/**
 * Zod Validation Schemas — Giám sát Bảng kiểm chung (GSC)
 * 
 * Sử dụng trong Server Actions trước khi ghi dữ liệu vào DB.
 * Tham chiếu: AGENTS.md 5d (Zod Validation), Playbook 3a
 */
import { z } from "zod";

// ============================================================
// Phiên giám sát (Session)
// ============================================================

export const gscSessionSchema = z.object({
  khoa_id: z.string().uuid("Khoa không hợp lệ"),
  khu_vuc_id: z.string().uuid("Khu vực không hợp lệ").nullable().optional(),
  nguoi_giam_sat_id: z.string().uuid("Người giám sát không hợp lệ").nullable().optional(),
  nhan_vien_id: z.string().uuid("Nhân viên không hợp lệ").nullable().optional(),
  nghe_nghiep_id: z.string().uuid("Nghề nghiệp không hợp lệ").nullable().optional(),
  bang_kiem_id: z.string().uuid("Bảng kiểm không hợp lệ").nullable().optional(),
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
