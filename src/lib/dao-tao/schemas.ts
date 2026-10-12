/** Zod cho input server action Đào tạo — thuần, không I/O. */
import { z } from "zod";

const MAX_OPTIONS = 20;

/** Id dạng 8-4-4-4-12 hex (không ép version/variant để không loại dữ liệu cũ). */
export const daoTaoIdSchema = z.guid({ error: "Mã định danh không hợp lệ." });

/** Id phương án: chuỗi ngắn (không ép uuid — dữ liệu ngân hàng cũ có thể khác định dạng). */
const optionIdSchema = z
  .string({ error: "Mã phương án không hợp lệ." })
  .min(1, { error: "Mã phương án không hợp lệ." })
  .max(64, { error: "Mã phương án quá dài." });

const optionIdList = z
  .array(optionIdSchema, { error: "Danh sách phương án không hợp lệ." })
  .max(MAX_OPTIONS, { error: `Tối đa ${MAX_OPTIONS} phương án.` });

export const traLoiSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("single"), optionId: optionIdSchema.nullable() }),
    z.object({ kind: z.literal("multi"), optionIds: optionIdList }),
    z.object({
      kind: z.literal("true_false_cluster"),
      byOptionId: z
        .record(optionIdSchema, z.boolean().nullable(), { error: "Câu trả lời Đúng/Sai không hợp lệ." })
        .refine((r) => Object.keys(r).length <= MAX_OPTIONS, {
          error: `Tối đa ${MAX_OPTIONS} phương án.`,
        }),
    }),
    z.object({ kind: z.literal("order"), orderedOptionIds: optionIdList }),
  ],
  { error: "Câu trả lời không hợp lệ." },
);

export const saveTraLoiInputSchema = z.object({
  lanThiId: daoTaoIdSchema,
  cauId: daoTaoIdSchema,
  traLoi: traLoiSchema,
});

export const examFormThongTinSchema = z.object({
  hoTen: z
    .string({ error: "Vui lòng nhập họ tên." })
    .trim()
    .min(1, { error: "Vui lòng nhập họ tên." })
    .max(120, { error: "Họ tên tối đa 120 ký tự." }),
  khoaDonVi: z
    .string({ error: "Vui lòng nhập khoa / đơn vị." })
    .trim()
    .min(1, { error: "Vui lòng nhập khoa / đơn vị." })
    .max(200, { error: "Khoa / đơn vị tối đa 200 ký tự." }),
  email: z.string().trim().max(254, { error: "Email tối đa 254 ký tự." }).optional(),
});

const quotaSchema = z
  .record(
    z.string().max(40, { error: "Khóa quota quá dài." }),
    z.number({ error: "Quota phải là số." }).finite().min(0, { error: "Quota không được âm." }).max(1000),
    { error: "Quota không hợp lệ." },
  )
  .refine((r) => Object.keys(r).length <= 20, { error: "Quota tối đa 20 mục." });

const soCauSchema = z
  .number({ error: "Số câu phải là số." })
  .int({ error: "Số câu phải là số nguyên." })
  .min(1, { error: "Số câu tối thiểu 1." })
  .max(300, { error: "Số câu tối đa 300." });

const thoiGianSchema = z
  .number({ error: "Thời gian phải là số." })
  .int({ error: "Thời gian (phút) phải là số nguyên." })
  .min(1, { error: "Thời gian tối thiểu 1 phút." })
  .max(600, { error: "Thời gian tối đa 600 phút." });

export const updateMucDoThiThuSchema = z.object({
  id: daoTaoIdSchema,
  so_cau: soCauSchema,
  thoi_gian_phut: thoiGianSchema,
  bloom_quota: quotaSchema.optional(),
  loai_quota: quotaSchema.optional(),
});

export const kyThiInputSchema = z.object({
  ten: z
    .string({ error: "Vui lòng nhập tên kỳ thi." })
    .trim()
    .min(1, { error: "Vui lòng nhập tên kỳ thi." })
    .max(200, { error: "Tên kỳ thi tối đa 200 ký tự." }),
  mo_ta: z.string().max(2000, { error: "Mô tả tối đa 2000 ký tự." }).optional(),
  so_cau: soCauSchema,
  thoi_gian_phut: thoiGianSchema,
  diem_dat_pct: z
    .number({ error: "Điểm đạt phải là số." })
    .finite()
    .min(0, { error: "Điểm đạt từ 0 đến 100%." })
    .max(100, { error: "Điểm đạt từ 0 đến 100%." }),
  bloom_quota: quotaSchema.optional(),
  loai_quota: quotaSchema.optional(),
  chu_de_mas: z
    .array(z.string().min(1).max(80, { error: "Mã chủ đề quá dài." }))
    .max(100, { error: "Tối đa 100 chủ đề." })
    .optional(),
  so_lan_cho_phep: z
    .number()
    .int({ error: "Số lượt phải là số nguyên." })
    .min(1, { error: "Số lượt tối thiểu 1." })
    .max(50, { error: "Số lượt tối đa 50." })
    .optional(),
  shuffle_cau: z.boolean().optional(),
  shuffle_dap_an: z.boolean().optional(),
  han_chung_chi_thang: z
    .number()
    .int({ error: "Hạn chứng chỉ phải là số tháng nguyên." })
    .min(1, { error: "Hạn chứng chỉ từ 1 đến 60 tháng." })
    .max(60, { error: "Hạn chứng chỉ từ 1 đến 60 tháng." })
    .optional(),
});

export const updateKyThiPatchSchema = kyThiInputSchema.partial().extend({
  trang_thai: z.enum(["draft", "published", "closed"], { error: "Trạng thái không hợp lệ." }).optional(),
});

/** Parse và ném lỗi tiếng Việt (thông điệp đầu tiên) — dùng trong server action. */
export function parseDaoTaoInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message || "Dữ liệu không hợp lệ.");
  }
  return r.data;
}
