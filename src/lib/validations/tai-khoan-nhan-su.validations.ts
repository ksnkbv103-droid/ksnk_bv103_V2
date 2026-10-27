/**
 * Zod — thao tác tài khoản đăng nhập nhân sự (Quản trị hệ thống).
 * Dùng trong Server Actions SAU khi đã kiểm quyền (`ensureRbacAdmin`), TRƯỚC khi chạm DB/Auth.
 */
import { z } from "zod";

export const staffIdSchema = z.string().trim().uuid("Mã nhân sự không hợp lệ.");

/** Supabase Auth giới hạn 72 ký tự cho mật khẩu. */
export const passwordSchema = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự.")
  .max(72, "Mật khẩu tối đa 72 ký tự.");

/** Không dùng `.email()`: email khách pilot (`…@bv103`) không có tên miền chuẩn. */
export const loginEmailSchema = z.string().trim().max(254, "Email quá dài.");

export const setStaffKsnkRbacRoleSchema = z.object({
  staffId: staffIdSchema,
  /** Rỗng = gỡ vai trò; giá trị khác được đối chiếu với danh sách gán được ở action. */
  roleName: z.string().trim().max(64, "Tên vai trò không hợp lệ."),
  confirmActorPassword: z.string().max(256).optional(),
});

export const provisionStaffAuthAccountSchema = z.object({
  staffId: staffIdSchema,
  password: passwordSchema,
});

export const adminResetStaffPasswordSchema = z.object({
  staffId: staffIdSchema,
  password: passwordSchema,
  confirmActorPassword: z.string().max(256),
  secondApproverEmail: loginEmailSchema.optional(),
});

export const setupGuestStatsPilotAccountSchema = z.object({
  password: passwordSchema,
  email: loginEmailSchema.optional(),
  /** Nhập lại mật khẩu quản trị (cổng ADM-01) — bắt buộc như các thao tác tài khoản khác. */
  confirmActorPassword: z.string().min(1, "Nhập mật khẩu của bạn để xác nhận.").max(256),
});

/** Trả `{ ok: true, data }` hoặc `{ ok: false, error }` với câu lỗi tiếng Việt đầu tiên. */
export function parseOrFirstError<T extends z.ZodType>(
  schema: T,
  input: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const res = schema.safeParse(input);
  if (res.success) return { ok: true, data: res.data };
  return { ok: false, error: res.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
}
