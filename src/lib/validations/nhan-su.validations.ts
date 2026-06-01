/**
 * Zod Validation Schemas — Nhân sự (Master Data)
 * 
 * Sử dụng trong Server Actions trước khi ghi dữ liệu vào DB.
 * Tham chiếu: AGENTS.md 5d (Zod Validation)
 */
import { z } from "zod";

// ============================================================
// Hồ sơ nhân sự
// ============================================================

export const nhanSuSchema = z.object({
  ho_ten: z.string().min(1, "Họ tên không được trống").max(200),
  email: z
    .string()
    .email("Email không hợp lệ")
    .or(z.literal(""))
    .nullable()
    .optional(),
  so_dien_thoai: z.string().max(20).nullable().optional(),
  /** Hỗ trợ cả key hiện hành `ma_nv` và alias cũ `ma_nhan_vien` khi validate input. */
  ma_nv: z.string().max(50).nullable().optional(),
  ma_nhan_vien: z.string().max(50).nullable().optional(),
  khoa_id: z.string().uuid("Khoa không hợp lệ").nullable().optional(),
  to_id: z.string().uuid("Tổ không hợp lệ").nullable().optional(),
  chuc_vu_id: z.string().uuid("Chức vụ không hợp lệ").nullable().optional(),
  chuc_danh_id: z.string().uuid("Chức danh không hợp lệ").nullable().optional(),
  nghe_nghiep_id: z.string().uuid("Nghề nghiệp không hợp lệ").nullable().optional(),
  vai_tro_he_thong_id: z.string().uuid("Vai trò không hợp lệ").nullable().optional(),
  is_active: z.boolean().default(true),
});

