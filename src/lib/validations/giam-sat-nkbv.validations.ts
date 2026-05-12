/**
 * Zod Validation Schemas — Giám sát Ca bệnh NKBV
 * 
 * Sử dụng trong Server Actions trước khi ghi dữ liệu vào DB.
 * Tham chiếu: AGENTS.md 5d (Zod Validation)
 */
import { z } from "zod";

export const giamSatNkbvCaSchema = z.object({
  ma_ca: z.string().min(1, "Mã phiếu không được để trống").max(50),
  khoa_ghi_nhan_id: z.string().uuid("Khoa ghi nhận không hợp lệ"),
  ma_benh_nhan: z.string().max(50).nullable().optional(),
  ho_ten_benh_nhan: z.string().min(1, "Họ tên bệnh nhân không được để trống").max(200),
  ngay_sinh: z.string().nullable().optional(),
  gioi_tinh: z.string().nullable().optional(),
  ngay_vao_vien: z.string().nullable().optional(),
  ngay_phat_hien: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").optional(),
  vi_tri_nhiem_khuan: z.string().nullable().optional(),
  tac_nhan_vi_khuan: z.string().nullable().optional(),
  tom_tat_dien_bien: z.string().nullable().optional(),
  bien_phap_phong_ngua: z.string().nullable().optional(),
  loai_nkbv_id: z.string().uuid("Loại NKBV không hợp lệ"),
  trang_thai_id: z.string().uuid("Trạng thái phiếu không hợp lệ"),
  ly_do_loai_tru: z.string().nullable().optional(),
  nguoi_ghi_id: z.string().uuid("Người ghi không hợp lệ").nullable().optional(),
  is_active: z.boolean().default(true),
});

export type GiamSatNkbvCaInput = z.infer<typeof giamSatNkbvCaSchema>;
