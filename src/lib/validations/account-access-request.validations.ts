/**
 * Zod — yêu cầu cấp / đặt lại tài khoản. Ba hàm đầu là public (chưa đăng nhập):
 * giới hạn độ dài để chặn payload lớn trước khi chạm DB.
 */
import { z } from "zod";
import {
  loginEmailSchema,
  passwordSchema,
  staffIdSchema,
} from "./tai-khoan-nhan-su.validations";

const trimmed = (max: number, msg: string) => z.string().trim().max(max, msg);

export const submitAccountAccessRequestSchema = z.object({
  ho_ten: trimmed(200, "Họ tên không hợp lệ.").min(2, "Họ tên không hợp lệ."),
  email: loginEmailSchema,
  khoa_id: z.string().trim().min(1, "Chọn khoa / phòng từ danh mục.").uuid("Khoa / phòng không hợp lệ — chọn lại từ danh sách."),
  chuc_danh_id: z.string().trim().min(1, "Chọn chức danh từ danh mục.").uuid("Chức danh không hợp lệ — chọn lại từ danh mục."),
  ma_nv: trimmed(50, "Mã nhân viên quá dài.").optional(),
  so_dien_thoai: trimmed(20, "Số điện thoại không hợp lệ.").optional(),
  ly_do: trimmed(1000, "Lý do quá dài (tối đa 1000 ký tự).").min(5, "Lý do xin cấp tài khoản tối thiểu 5 ký tự."),
});

export const submitForgotResetAdminRequestSchema = z.object({
  email: loginEmailSchema,
  ma_nv: trimmed(50, "Mã nhân viên quá dài.").optional(),
  ly_do: trimmed(1000, "Lý do quá dài (tối đa 1000 ký tự).").min(5, "Lý do tối thiểu 5 ký tự."),
});

export const lookupAccountAccessRequestStatusSchema = z.object({
  email: loginEmailSchema,
  ma_nv: trimmed(50, "Mã nhân viên quá dài.").optional(),
});

export const approveAccountAccessRequestSchema = z.object({
  staffId: staffIdSchema,
  password: passwordSchema,
  confirmActorPassword: z.string().max(256),
});

export const approveForgotResetRequestSchema = approveAccountAccessRequestSchema.extend({
  secondApproverEmail: loginEmailSchema.optional(),
});

export const rejectAccountAccessRequestSchema = z.object({
  staffId: staffIdSchema,
  reason: trimmed(1000, "Lý do quá dài (tối đa 1000 ký tự).").min(3, "Lý do từ chối tối thiểu 3 ký tự."),
});
