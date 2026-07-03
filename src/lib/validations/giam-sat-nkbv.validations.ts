/**
 * Zod Validation Schemas — Giám sát Ca bệnh NKBV
 * 
 * Sử dụng trong Server Actions trước khi ghi dữ liệu vào DB.
 * Tham chiếu: AGENTS.md 5d (Zod Validation)
 */
import { z } from "zod";

const clinicalNotesSchema = z.object({
  tom_tat_dien_bien: z.string().nullable().optional(),
  bien_phap_phong_ngua: z.string().nullable().optional(),
  ly_do_loai_tru: z.string().nullable().optional(),
}).optional();

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
  
  ma_benh_an: z.string().min(1, "Mã bệnh án không được để trống").max(50).nullable().optional(),
  ma_benh_pham: z.string().max(50).nullable().optional(),
  loai_benh_pham: z.string().nullable().optional(),
  so_luong: z.string().nullable().optional(),
  ngay_ra_vien: z.string().nullable().optional(),
  ket_cuc_dieu_tri: z.string().nullable().optional(),
  ly_do_tu_vong: z.string().nullable().optional(),
  tu_vong_lien_quan_nkbv: z.boolean().nullable().optional(),

  // Cột cũ lưu tạm ở top-level khi nhận từ client, sẽ đóng gói vào clinical_notes khi ghi vào DB
  tom_tat_dien_bien: z.string().nullable().optional(),
  bien_phap_phong_ngua: z.string().nullable().optional(),
  ly_do_loai_tru: z.string().nullable().optional(),
  
  clinical_notes: clinicalNotesSchema,
  vi_sinh_record_id: z.string().uuid().nullable().optional(),
  verification_data: z.any().optional(),
  
  loai_nkbv_id: z.string().uuid("Loại NKBV không hợp lệ"),
  trang_thai_id: z.string().uuid("Trạng thái phiếu không hợp lệ"),
  nguoi_ghi_id: z.string().uuid("Người ghi không hợp lệ").nullable().optional(),
  is_active: z.boolean().default(true),
});

export type GiamSatNkbvCaInput = z.infer<typeof giamSatNkbvCaSchema>;
