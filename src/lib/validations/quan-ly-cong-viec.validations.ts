import { z } from "zod";

/** Form / client hay gửi `""` thay vì `null` — Postgres UUID / optional FK cần null. */
function qlcvEmptyToNull(v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") {
    const cleaned = v.replace(/\u0000/g, "").trim();
    return cleaned === "" ? null : cleaned;
  }
  return v;
}

const optionalUuid = (field: string) =>
  z.preprocess(
    qlcvEmptyToNull,
    z.union([z.string().uuid(`${field} không hợp lệ`), z.null()]).optional(),
  );

/**
 * Zod Schema cho Quản lý công việc — CHECK `qlcv_fact_cong_viec` (7 mã Track B, `20260709140000`).
 */
export const congViecSchema = z.object({
  tieu_de: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\u0000/g, "") : v),
    z.string().trim().min(1, "Tiêu đề không được để trống"),
  ),
  mo_ta: z.preprocess(qlcvEmptyToNull, z.union([z.string(), z.null()]).optional()),
  loai_cong_viec: z.enum(["DINH_KY", "DOT_XUAT", "KHAN_CAP"]).default("DOT_XUAT"),
  muc_do_uu_tien: z.enum(["THAP", "TRUNG_BINH", "CAO"]).default("TRUNG_BINH"),

  /** Domain A: Người thực hiện — form create bắt buộc; schema optional để dùng chung update/đề xuất. */
  nguoi_phu_trach_id: optionalUuid("Người thực hiện"),
  to_cong_tac_id: optionalUuid("Tổ công tác"),
  /** Domain A FE-first: địa điểm optional (cột DB giữ soft-optional). */
  dia_diem_khoa_id: optionalUuid("Khoa/đơn vị địa điểm"),
  nhiem_vu_id: optionalUuid("Nhiệm vụ"),

  vi_tri_thuc_hien: z.preprocess(qlcvEmptyToNull, z.union([z.string(), z.null()]).optional()),
  nguoi_phoi_hop_ids: z
    .array(z.string().uuid("Người phối hợp không hợp lệ"))
    .max(20)
    .optional()
    .default([]),
  nguoi_theo_doi_ids: z
    .array(z.string().uuid("Người theo dõi không hợp lệ"))
    .max(20)
    .optional()
    .default([]),

  han_hoan_thanh: z.preprocess(qlcvEmptyToNull, z.union([z.string().min(1), z.null()]).optional()),

  /** PDCA từ analytics — map sang cột analytics_meta. */
  analytics_meta: z
    .object({
      chi_so: z.string().trim().min(1).optional().nullable(),
      khoa_id: z.string().uuid().optional().nullable(),
      ky_do_lai: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
      gia_tri_luc_tao: z.number().finite().optional().nullable(),
    })
    .optional()
    .nullable(),

  /** QLCV-12: nguồn liên kết module khác. */
  nguon_lien_ket: z
    .object({
      module: z.enum(["CSSD_SU_CO", "GIAM_SAT", "NKBV", "analytics"]),
      id: z.string().trim().min(1).optional().nullable(),
      ma: z.string().trim().min(1).optional().nullable(),
      label: z.string().trim().min(1).optional().nullable(),
      href: z.string().trim().min(1).optional().nullable(),
    })
    .optional()
    .nullable(),
});


/** Hạn bắt buộc với đột xuất/khẩn (Domain A / SSOT Q-04). */
export const congViecSchemaWithHanRule = congViecSchema.superRefine((data, ctx) => {
  if (data.loai_cong_viec === "DOT_XUAT" || data.loai_cong_viec === "KHAN_CAP") {
    if (!data.han_hoan_thanh) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hạn hoàn thành bắt buộc với việc đột xuất/khẩn cấp",
        path: ["han_hoan_thanh"],
      });
    }
  }
});

/** Tạo việc active: tiêu đề + người thực hiện (+ hạn theo rule trên). */
export const congViecCreateSchema = congViecSchemaWithHanRule.superRefine((data, ctx) => {
  if (!data.nguoi_phu_trach_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Chọn người thực hiện",
      path: ["nguoi_phu_trach_id"],
    });
  }
});

export type CongViecInput = z.infer<typeof congViecSchema>;

