import { z } from "zod";

/**
 * Zod Schema cho Quản lý công việc v2.2
 * Khớp 100% với DB: fact_cong_viec (migration 20260510002 + 003)
 */
export const congViecSchema = z.object({
  tieu_de: z.string().min(1, "Tiêu đề không được để trống"),
  mo_ta: z.string().optional().nullable(),
  loai_pham_vi: z.enum(["NOI_BO", "MANG_LUOI"]).default("NOI_BO"),
  loai_cong_viec: z.enum(["DINH_KY", "DOT_XUAT", "KHAN_CAP"]).default("DOT_XUAT"),
  muc_do_uu_tien: z.enum(["THAP", "TRUNG_BINH", "CAO"]).default("TRUNG_BINH"),

  nguoi_phu_trach_id: z.string().uuid("Người phụ trách không hợp lệ").optional().nullable(),
  khoa_thuc_hien_id: z.string().uuid("Khoa thực hiện không hợp lệ").optional().nullable(),
  to_cong_tac_id: z.string().uuid("Tổ công tác không hợp lệ").optional().nullable(),

  han_hoan_thanh: z.string().optional().nullable(),
  cong_viec_cha_id: z.string().uuid().optional().nullable(),
});

export type CongViecInput = z.infer<typeof congViecSchema>;
