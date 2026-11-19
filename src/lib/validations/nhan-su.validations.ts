/**
 * Zod Validation Schemas — Nhân sự (Master Data)
 * 
 * Sử dụng trong Server Actions trước khi ghi dữ liệu vào DB.
 * Tham chiếu: CLAUDE.md (Zod ở ranh giới action)
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
  khoa_id: z.guid("Khoa không hợp lệ").nullable().optional(),
  to_id: z.guid("Tổ không hợp lệ").nullable().optional(),
  chuc_vu_id: z.guid("Chức vụ không hợp lệ").nullable().optional(),
  chuc_danh_id: z.guid("Chức danh không hợp lệ").nullable().optional(),
  nghe_nghiep_id: z.guid("Nghề nghiệp không hợp lệ").nullable().optional(),
  vai_tro_he_thong_id: z.guid("Vai trò không hợp lệ").nullable().optional(),
  is_active: z.boolean().default(true),
});

