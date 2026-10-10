/**
 * Zod — ghi quản trị ngoài lõi danh mục: ma trận phân quyền và phân bổ bộ dụng cụ theo khoa.
 */
import { z } from "zod";
import { masterRequiredIdSchema } from "./master-data-write.validations";

/** Ma trận RBAC: { roleId: [permissionId, …] }. Mọi id là UUID; trần để chặn payload khổng lồ. */
export const rbacMatrixSchema = z
  .record(masterRequiredIdSchema, z.array(masterRequiredIdSchema).max(2000, "Một vai trò có quá nhiều quyền."))
  .refine((m) => Object.keys(m).length > 0, "Ma trận phân quyền trống.")
  .refine((m) => Object.keys(m).length <= 50, "Quá nhiều vai trò trong ma trận.");

export const allocateProceduralSetSchema = z.object({
  boDungCuId: masterRequiredIdSchema,
  khoaPhongId: masterRequiredIdSchema,
  quantity: z
    .number({ error: "Số lượng phân bổ phải là số." })
    .int("Số lượng phân bổ phải là số nguyên.")
    .min(0, "Số lượng phân bổ không được âm.")
    .max(100000, "Số lượng phân bổ quá lớn."),
});
