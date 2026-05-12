import { z } from "zod";

const isoDay = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải dạng YYYY-MM-DD")
  .optional();

/** Ranh giới server cho bộ lọc dashboard Giám sát tuân thủ (Compliance). */
export const complianceDashboardFiltersSchema = z.object({
  bang_kiem_mas: z.array(z.string().trim()).optional(),
  khoi_ids: z.array(z.string().min(1)).optional(),
  khoa_ids: z.array(z.string().min(1)).optional(),
  nghe_nghiep_ids: z.array(z.string().min(1)).optional(),
  khu_vuc_ids: z.array(z.string().min(1)).optional(),
  tu_ngay: isoDay,
  den_ngay: isoDay,
  include_options: z.boolean().optional(),
  supervision_type: z.enum(['ALL', 'KSNK', 'CHEO', 'TU_GIAM_SAT']).optional(),
});

export type ParsedComplianceDashboardFilters = z.infer<typeof complianceDashboardFiltersSchema>;
