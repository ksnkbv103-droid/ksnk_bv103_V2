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

const bsiVerificationSchema = z.object({
  is_fungi_respiratory: z.boolean(),
  pathogen_name: z.string().min(1, "Tên vi sinh vật không được để trống"),
  pathogen_type: z.enum(['RECOGNIZED', 'COMMON_COMMENSAL']),
  commensal_culture_count: z.number().nonnegative(),
  commensal_drawn_separate: z.boolean(),
  symptoms_window_7days: z.boolean(),
  cvc_placed_days: z.number().nonnegative(),
  cvc_active_on_event: z.boolean(),
  device_placed_date: z.string().nullable().optional(),
  device_removed_date: z.string().nullable().optional(),
  is_neutropenia: z.boolean(),
  is_intestinal_pathogen: z.boolean(),
  has_localized_infection: z.boolean(),
  localized_pathogen_matches: z.boolean(),
  is_in_sbap_window: z.boolean(),
  blood_mandatory_for_localized: z.boolean(),
});

const vaeVerificationSchema = z.object({
  patient_age: z.number().nonnegative(),
  vent_days: z.number().nonnegative(),
  device_placed_date: z.string().nullable().optional(),
  device_removed_date: z.string().nullable().optional(),
  has_stable_baseline_peep_fio2: z.boolean(),
  peep_increase_ge_3: z.boolean(),
  fio2_increase_ge_20: z.boolean(),
  temp_fever_or_hypothermia: z.boolean(),
  wbc_abnormal: z.boolean(),
  new_antimicrobial_ge_4days: z.boolean(),
  has_purulent_sputum_and_positive_culture: z.boolean(),
  has_quantitative_culture_positive: z.boolean(),
  has_respiratory_viral_or_pathogen_test_positive: z.boolean(),
  has_chest_imaging_abnormal: z.boolean(),
  has_cardiopulmonary_disease_underlying: z.boolean(),
  imaging_films_count: z.number().nonnegative(),
  fever_or_wbc_abnormal: z.boolean(),
  altered_mental_status_ge_70yo: z.boolean(),
  respiratory_symptoms_count: z.number().nonnegative(),
  microbiology_evidence: z.enum(['NONE', 'PNU2', 'PNU3']),
});

const utiVerificationSchema = z.object({
  urine_cfu_count: z.number().nonnegative(),
  pathogen_count: z.number().nonnegative(),
  has_fungi_yeast_parasite: z.boolean(),
  foley_placed_days: z.number().nonnegative(),
  foley_active_on_event: z.boolean(),
  device_placed_date: z.string().nullable().optional(),
  device_removed_date: z.string().nullable().optional(),
  has_fever: z.boolean(),
  has_suprapubic_tenderness: z.boolean(),
  has_costovertebral_pain: z.boolean(),
  has_dysuria: z.boolean(),
  has_blood_culture_positive_in_window: z.boolean(),
  blood_urine_pathogen_matches: z.boolean(),
});

const ssiVerificationSchema = z.object({
  days_since_surgery: z.number().nonnegative(),
  has_implant: z.boolean(),
  ssi_depth: z.enum(['SUPERFICIAL', 'DEEP', 'ORGAN_SPACE', 'NONE']),
  superficial_purulent_drainage: z.boolean(),
  superficial_culture_positive: z.boolean(),
  superficial_opened_with_inflammation: z.boolean(),
  superficial_physician_diagnosis: z.boolean(),
  deep_purulent_drainage: z.boolean(),
  deep_dehisced_or_opened_with_symptoms: z.boolean(),
  deep_abscess_imaging_pathology: z.boolean(),
  organ_space_purulent_drainage: z.boolean(),
  organ_space_culture_positive: z.boolean(),
  organ_space_abscess_imaging_pathology: z.boolean(),
  has_blood_culture_positive: z.boolean(),
  blood_ssi_pathogen_matches: z.boolean(),
  loai_phau_thuat_nhsn: z.string().min(1, "Loại phẫu thuật theo NHSN không được để trống"),
});

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
