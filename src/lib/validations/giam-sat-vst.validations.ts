/**
 * Zod Validation Schemas — Giám sát Vệ sinh tay (VST)
 *
 * Cổng ghi trước khi lưu `gstt_fact_vst_sessions` / `gstt_fact_vst`.
 */
import { z } from "zod";
import { ACTIONS, MOMENTS, VST_MAX_MOMENTS_PER_OPP } from "@/modules/giam-sat-vst/lib/vst-constants";
import { VST_MAX_PERSONS_HARD } from "@/modules/giam-sat-vst/lib/vst-form-model";

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
    thoi_diems: z
      .array(vstMomentSchema)
      .min(1, "Phải có ít nhất 1 thời điểm")
      .max(VST_MAX_MOMENTS_PER_OPP, "Một cơ hội tối đa 5 thời điểm WHO"),
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
    // VST-03: kỹ thuật / thời gian / găng trên phiếu WHO là tùy chọn.
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
  /** GS-01: bắt buộc khi tạo mới (action); optional grandfather khi sửa. */
  vi_tri: z.string().optional(),
  hinh_thuc_id: z.string().uuid("Hình thức giám sát không hợp lệ").nullable().optional(),
  cach_thuc_id: z.string().uuid("Cách thức giám sát không hợp lệ").nullable().optional(),
  thoi_gian_bat_dau: z.string().nullable().optional(),
  thoi_gian_ket_thuc: z.string().nullable().optional(),
  ghi_chu: z.string().optional(),
  is_active: z.boolean().default(true),
  /** GS-01/03: gan_nb bool luôn ghi — mặc định false. */
  is_bo_sung_nguoi_benh: z.boolean().default(false),
  ma_benh_an: z.string().max(200).optional(),
  ma_nguoi_benh: z.string().max(200).optional(),
  ten_nguoi_benh: z.string().max(300).optional(),
  so_giuong_nguoi_benh: z.string().max(120).optional(),
  bn_tho_may: z.boolean().optional(),
  bn_phau_thuat: z.boolean().optional(),
  bn_cvc: z.boolean().optional(),
  bn_foley: z.boolean().optional(),
  bn_nhiem_mdro: z.boolean().optional(),
  bn_mdro_phenotype: z.string().max(120).optional(),
  bn_nhiem_tac_nhan_nguy_hiem: z.boolean().optional(),
  bn_tac_nhan_nguy_hiem_ten: z.string().max(300).optional(),
});

export const vstSaveSessionSchema = z
  .object({
    session: vstSessionSchema,
    observations: z
      .array(vstObservationSchema)
      .min(1, "Phải có ít nhất 1 quan sát")
      // VST-05: trần cứng 8 (prod); tạo mới ≤3 / grandfather khi sửa — enforce ở action.
      .max(VST_MAX_PERSONS_HARD, "Một phiên tối đa 8 đối tượng giám sát"),
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
