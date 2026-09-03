/**
 * Zod Validation Schemas — Giám sát Vệ sinh tay (VST)
 *
 * Cổng ghi trước khi lưu `gstt_fact_vst_sessions` / `gstt_fact_vst`.
 */
import { z } from "zod";
import {
  ACTIONS,
  MOMENTS,
  isVstMissedAction,
  vstMaxIndications,
} from "@/modules/giam-sat-vst/lib/vst-constants";

/** UUID bắt buộc — chuỗi rỗng "" coi như thiếu (form thường set "" khi chưa chọn). */
const requiredUuid = (msgMissing: string, msgInvalid: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string({ error: msgMissing }).uuid({ error: msgInvalid }),
  );

/** UUID tùy chọn — chuỗi rỗng "" → null. */
const optionalUuid = (msg: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().uuid(msg).nullable().optional(),
  );

const vstMomentSchema = z.enum(MOMENTS, { error: "Thời điểm WHO không hợp lệ" });
const vstActionSchema = z.enum(ACTIONS, { error: "Hành động vệ sinh tay không hợp lệ" });

const vstOpportunitySchema = z
  .object({
    thoi_diems: z.array(vstMomentSchema).min(1, "Phải có ít nhất 1 thời điểm"),
    hanh_dong: vstActionSchema,
    dung_ky_thuat: z.boolean().nullable().optional(),
    du_thoi_gian: z.boolean().nullable().optional(),
    co_deo_gang: z.boolean().nullable().optional(),
    thoi_gian_ghi_nhan: z.string().optional(),
  })
  .superRefine((opp, ctx) => {
    const unique = new Set(opp.thoi_diems);
    if (unique.size !== opp.thoi_diems.length) {
      ctx.addIssue({
        code: "custom",
        path: ["thoi_diems"],
        message: "Không được chọn trùng thời điểm WHO trên một cơ hội",
      });
    }
    const max = vstMaxIndications(opp.hanh_dong);
    if (opp.thoi_diems.length > max) {
      ctx.addIssue({
        code: "custom",
        path: ["thoi_diems"],
        message: isVstMissedAction(opp.hanh_dong)
          ? "Cơ hội bỏ sót chỉ được 1 chỉ định WHO"
          : "Cơ hội tuân thủ tối đa 2 chỉ định WHO",
      });
    }
    if (isVstMissedAction(opp.hanh_dong)) {
      if (opp.co_deo_gang == null) {
        ctx.addIssue({
          code: "custom",
          path: ["co_deo_gang"],
          message: "Bỏ sót: bắt buộc đánh giá lạm dụng găng",
        });
      }
      return;
    }
    if (opp.dung_ky_thuat == null || opp.du_thoi_gian == null) {
      ctx.addIssue({
        code: "custom",
        path: opp.dung_ky_thuat == null ? ["dung_ky_thuat"] : ["du_thoi_gian"],
        message: "Tuân thủ: bắt buộc đánh giá đúng kỹ thuật và đủ thời gian",
      });
    }
  });

const vstObservationSchema = z.object({
  khoa_id: z.string().uuid("Khoa không hợp lệ"),
  nhan_vien_id: optionalUuid("Nhân viên không hợp lệ"),
  ten_nhan_vien_ngoai: z.string().optional(),
  khu_vuc_id: optionalUuid("Khu vực không hợp lệ"),
  khu_vuc: z.string().optional(),
  vi_tri: z.string().optional(),
  nghe_nghiep_id: requiredUuid("Nghề nghiệp là bắt buộc", "Nghề nghiệp không hợp lệ"),
  nghe_nghiep: z.string().optional(),
  ngay_giam_sat: z.string().optional(),
  opportunities: z.array(vstOpportunitySchema).min(1, "Phải có ít nhất 1 cơ hội"),
});

const vstSessionSchema = z.object({
  khoa_id: z.string().uuid("Khoa không hợp lệ"),
  khu_vuc_id: requiredUuid("Khu vực giám sát là bắt buộc", "Khu vực không hợp lệ"),
  nguoi_giam_sat_id: z.string().uuid("Người giám sát không hợp lệ").nullable().optional(),
  ngay_giam_sat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD"),
  vi_tri: z.string().optional(),
  hinh_thuc_id: z.string().uuid("Hình thức giám sát không hợp lệ").nullable().optional(),
  cach_thuc_id: z.string().uuid("Cách thức giám sát không hợp lệ").nullable().optional(),
  thoi_gian_bat_dau: z.string().nullable().optional(),
  thoi_gian_ket_thuc: z.string().nullable().optional(),
  ghi_chu: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const vstSaveSessionSchema = z
  .object({
    session: vstSessionSchema,
    observations: z
      .array(vstObservationSchema)
      .min(1, "Phải có ít nhất 1 quan sát")
      .max(3, "Một phiên tối đa 3 đối tượng giám sát"),
  })
  .superRefine((payload, ctx) => {
    const sessionKhoa = String(payload.session.khoa_id);
    const sessionKhuVuc = String(payload.session.khu_vuc_id);
    payload.observations.forEach((obs, index) => {
      if (String(obs.khoa_id) !== sessionKhoa) {
        ctx.addIssue({
          code: "custom",
          path: ["observations", index, "khoa_id"],
          message: "Khoa trên dòng quan sát phải khớp khoa của phiên",
        });
      }
      const obsKhuVuc = String(obs.khu_vuc_id || "").trim();
      if (obsKhuVuc && obsKhuVuc !== sessionKhuVuc) {
        ctx.addIssue({
          code: "custom",
          path: ["observations", index, "khu_vuc_id"],
          message: "Khu vực trên dòng quan sát phải khớp khu vực của phiên",
        });
      }
    });
  });
