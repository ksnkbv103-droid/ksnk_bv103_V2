import type { 
  BsiVerificationData, 
  VaeVerificationData, 
  UtiVerificationData, 
  SsiVerificationData 
} from "../types/nkbv-verification";
import { differenceInCalendarDays, parseISO } from "date-fns";

export interface PathogenClassification {
  isFungiRespiratory: boolean;
  isCommensal: boolean;
  isIntestinal: boolean;
  isCandidaOrParasite: boolean;
  suggestedType: 'RECOGNIZED' | 'COMMON_COMMENSAL';
}

/**
 * Tác nhân cấm dùng cho PVAP trên cấy đờm/ETA (Candida, CoNS, Enterococcus, flora hỗn hợp…).
 * Không áp dụng khi mẫu từ mô phổi / dịch màng phổi.
 */
export function isExcludedPvapPathogen(name: string): boolean {
  const p = name.trim().toLowerCase();
  if (!p) return false;
  return /candida|yeast|nấm men|coagulase|epidermidis|enterococ|flora|hỗn hợp|hon hop|cons\b/i.test(p);
}

/**
 * Classifies a pathogen based on CDC/NHSN clinical criteria
 */
export function classifyPathogen(name: string): PathogenClassification {
  const p = name.trim().toLowerCase();
  
  const isIntestinal = /enteroc|escher|e\.?\s*coli|klebs|bacteroid|candida|clostrid|salmonel|shigel|pseudomon|enterobac|proteus|serratia/i.test(p);
  const isFungiRespiratory = /blastomyc|histoplasm|coccidioid|paracoccidioid|cryptoc/i.test(p);
  const isCommensal = /coagulase|epidermidis|hominis|haemolyticus|saprophyticus|micrococcus|cutibacterium|propionibacterium|corynebacter|diphtheroid|bacillus|viridans/i.test(p);
  const isCandidaOrParasite = /candida|aspergil|yeast|men|nấm|fungi|parasite|trùng|sán/i.test(p);
  
  return {
    isFungiRespiratory,
    isCommensal,
    isIntestinal,
    isCandidaOrParasite,
    suggestedType: isCommensal ? 'COMMON_COMMENSAL' : 'RECOGNIZED',
  };
}

/**
 * Helper to calculate default suggested days between admission and discovery
 */
function getSuggestedDays(ngay_vao_vien?: string, ngay_phat_hien?: string): number {
  if (!ngay_vao_vien || !ngay_phat_hien) return 0;
  try {
    const dVao = parseISO(String(ngay_vao_vien).slice(0, 10));
    const dPh = parseISO(String(ngay_phat_hien).slice(0, 10));
    return Math.max(0, differenceInCalendarDays(dPh, dVao) + 1);
  } catch {
    return 0;
  }
}

/**
 * Prepopulates BSI checklist form data
 */
export function prepopulateBsiData(row: Record<string, any>, existing: Record<string, any> = {}): BsiVerificationData {
  const pathogen = String(row.tac_nhan_vi_khuan || "").trim();
  const cls = classifyPathogen(pathogen);
  const suggestedDays = getSuggestedDays(row.ngay_vao_vien, row.ngay_phat_hien);

  return {
    is_fungi_respiratory: existing.is_fungi_respiratory ?? cls.isFungiRespiratory,
    pathogen_name: existing.pathogen_name || pathogen,
    pathogen_type: existing.pathogen_type || cls.suggestedType,
    commensal_culture_count: existing.commensal_culture_count ?? (cls.isCommensal ? 2 : 0),
    commensal_drawn_separate: existing.commensal_drawn_separate ?? (cls.isCommensal ? true : false),
    symptoms_window_7days: existing.symptoms_window_7days ?? false,
    has_fever: existing.has_fever ?? false,
    has_chills: existing.has_chills ?? false,
    has_hypotension: existing.has_hypotension ?? false,
    is_infant_le1: existing.is_infant_le1 ?? false,
    has_hypothermia: existing.has_hypothermia ?? false,
    has_apnea: existing.has_apnea ?? false,
    has_bradycardia: existing.has_bradycardia ?? false,
    cvc_placed_days: existing.cvc_placed_days ?? (suggestedDays >= 3 ? suggestedDays : 0),
    cvc_active_on_event: existing.cvc_active_on_event ?? (suggestedDays >= 3 ? true : false),
    device_placed_date: existing.device_placed_date,
    device_removed_date: existing.device_removed_date,
    is_neutropenia: existing.is_neutropenia ?? false,
    has_hsct_or_gvhd: existing.has_hsct_or_gvhd ?? false,
    anc_wbc_lt_500_ge_2d: existing.anc_wbc_lt_500_ge_2d ?? false,
    has_severe_diarrhea_mbi: existing.has_severe_diarrhea_mbi ?? false,
    is_intestinal_pathogen: existing.is_intestinal_pathogen ?? cls.isIntestinal,
    has_localized_infection: existing.has_localized_infection ?? false,
    localized_pathogen_matches: existing.localized_pathogen_matches ?? false,
    is_in_sbap_window: existing.is_in_sbap_window ?? false,
    blood_mandatory_for_localized: existing.blood_mandatory_for_localized ?? false,
  };
}

/**
 * Prepopulates VAE checklist form data
 */
export function prepopulateVaeData(row: Record<string, any>, existing: Record<string, any> = {}): VaeVerificationData {
  const suggestedDays = getSuggestedDays(row.ngay_vao_vien, row.ngay_phat_hien);
  
  let patientAge = 18;
  if (row.ngay_sinh) {
    try {
      patientAge = Math.max(1, new Date().getFullYear() - new Date(row.ngay_sinh).getFullYear());
    } catch {
      // ignore
    }
  }

  return {
    patient_age: existing.patient_age ?? patientAge,
    vent_days: existing.vent_days ?? (suggestedDays >= 4 ? suggestedDays : 0),
    vent_daily_params: existing.vent_daily_params,
    has_stable_baseline_peep_fio2: existing.has_stable_baseline_peep_fio2 ?? false,
    peep_increase_ge_3: existing.peep_increase_ge_3 ?? false,
    fio2_increase_ge_20: existing.fio2_increase_ge_20 ?? false,
    temp_fever_or_hypothermia: existing.temp_fever_or_hypothermia ?? false,
    wbc_abnormal: existing.wbc_abnormal ?? false,
    new_antimicrobial_ge_4days: existing.new_antimicrobial_ge_4days ?? false,
    has_purulent_sputum_and_positive_culture: existing.has_purulent_sputum_and_positive_culture ?? false,
    has_quantitative_culture_positive: existing.has_quantitative_culture_positive ?? false,
    has_respiratory_viral_or_pathogen_test_positive: existing.has_respiratory_viral_or_pathogen_test_positive ?? false,
    pneu_trigger: existing.pneu_trigger ?? "CULTURE",
    has_chest_imaging_abnormal: existing.has_chest_imaging_abnormal ?? false,
    has_cardiopulmonary_disease_underlying: existing.has_cardiopulmonary_disease_underlying ?? false,
    imaging_films_count: existing.imaging_films_count ?? 1,
    fever_or_wbc_abnormal: existing.fever_or_wbc_abnormal ?? false,
    has_pneu_fever: existing.has_pneu_fever ?? false,
    has_pneu_hypothermia: existing.has_pneu_hypothermia ?? false,
    has_pneu_wbc_abnormal: existing.has_pneu_wbc_abnormal ?? false,
    altered_mental_status_ge_70yo: existing.altered_mental_status_ge_70yo ?? false,
    respiratory_symptoms_count: existing.respiratory_symptoms_count ?? 0,
    has_new_cough: existing.has_new_cough ?? false,
    has_purulent_sputum_symptom: existing.has_purulent_sputum_symptom ?? false,
    has_rales_or_wheeze: existing.has_rales_or_wheeze ?? false,
    has_worsening_gas_exchange: existing.has_worsening_gas_exchange ?? false,
    has_dyspnea: existing.has_dyspnea ?? false,
    has_tachypnea: existing.has_tachypnea ?? false,
    has_hemoptysis: existing.has_hemoptysis ?? false,
    has_pleuritic_chest_pain: existing.has_pleuritic_chest_pain ?? false,
    has_infant_respiratory_distress: existing.has_infant_respiratory_distress ?? false,
    has_infant_hr_abnormal: existing.has_infant_hr_abnormal ?? false,
    microbiology_evidence: existing.microbiology_evidence || "NONE",
    has_blood_culture_in_event_period: existing.has_blood_culture_in_event_period ?? false,
    blood_respiratory_pathogen_matches: existing.blood_respiratory_pathogen_matches ?? false,
    on_aprv_or_hfv: existing.on_aprv_or_hfv ?? false,
    on_ecmo: existing.on_ecmo ?? false,
  };
}

/**
 * Prepopulates UTI checklist form data
 */
export function prepopulateUtiData(row: Record<string, any>, existing: Record<string, any> = {}): UtiVerificationData {
  const pathogen = String(row.tac_nhan_vi_khuan || "").trim();
  const cls = classifyPathogen(pathogen);
  const suggestedDays = getSuggestedDays(row.ngay_vao_vien, row.ngay_phat_hien);

  return {
    urine_cfu_count: existing.urine_cfu_count ?? 100000,
    pathogen_count: existing.pathogen_count ?? 1,
    has_fungi_yeast_parasite: existing.has_fungi_yeast_parasite ?? cls.isCandidaOrParasite,
    foley_placed_days: existing.foley_placed_days ?? (suggestedDays >= 3 ? suggestedDays : 0),
    foley_active_on_event: existing.foley_active_on_event ?? (suggestedDays >= 3 ? true : false),
    foley_present_doe_or_prior: existing.foley_present_doe_or_prior,
    device_placed_date: existing.device_placed_date,
    device_removed_date: existing.device_removed_date,
    has_fever: existing.has_fever ?? false,
    has_suprapubic_tenderness: existing.has_suprapubic_tenderness ?? false,
    has_costovertebral_pain: existing.has_costovertebral_pain ?? false,
    has_dysuria: existing.has_dysuria ?? false,
    has_urgency: existing.has_urgency ?? false,
    has_frequency: existing.has_frequency ?? false,
    is_infant_le1: existing.is_infant_le1 ?? false,
    has_infant_hypothermia: existing.has_infant_hypothermia ?? false,
    has_infant_apnea: existing.has_infant_apnea ?? false,
    has_infant_bradycardia: existing.has_infant_bradycardia ?? false,
    has_infant_lethargy: existing.has_infant_lethargy ?? false,
    has_infant_vomiting: existing.has_infant_vomiting ?? false,
    has_blood_culture_positive_in_window: existing.has_blood_culture_positive_in_window ?? false,
    blood_urine_pathogen_matches: existing.blood_urine_pathogen_matches ?? false,
  };
}

/**
 * Prepopulates SSI checklist form data
 */
export function prepopulateSsiData(row: Record<string, any>, existing: Record<string, any> = {}): SsiVerificationData {
  const suggestedDays = getSuggestedDays(row.ngay_vao_vien, row.ngay_phat_hien);

  return {
    days_since_surgery: existing.days_since_surgery ?? (suggestedDays > 0 ? suggestedDays : 0),
    surgery_date: existing.surgery_date,
    doe_date: existing.doe_date || (row.ngay_phat_hien ? String(row.ngay_phat_hien).slice(0, 10) : undefined),
    is_patos: existing.is_patos ?? false,
    return_to_or_within_24h: existing.return_to_or_within_24h ?? false,
    has_implant: existing.has_implant ?? false,
    ssi_depth: existing.ssi_depth || "SUPERFICIAL",
    ssi_event_type:
      existing.ssi_event_type ||
      (existing.ssi_depth === "DEEP"
        ? "DIP"
        : existing.ssi_depth === "ORGAN_SPACE"
          ? "ORGAN_SPACE"
          : "SIP"),
    organ_space_site: existing.organ_space_site,
    superficial_purulent_drainage: existing.superficial_purulent_drainage ?? false,
    superficial_culture_positive: existing.superficial_culture_positive ?? false,
    superficial_opened_with_inflammation: existing.superficial_opened_with_inflammation ?? false,
    superficial_physician_diagnosis: existing.superficial_physician_diagnosis ?? false,
    deep_purulent_drainage: existing.deep_purulent_drainage ?? false,
    deep_dehisced_or_opened_with_symptoms: existing.deep_dehisced_or_opened_with_symptoms ?? false,
    deep_abscess_imaging_pathology: existing.deep_abscess_imaging_pathology ?? false,
    organ_space_purulent_drainage: existing.organ_space_purulent_drainage ?? false,
    organ_space_culture_positive: existing.organ_space_culture_positive ?? false,
    organ_space_abscess_imaging_pathology: existing.organ_space_abscess_imaging_pathology ?? false,
    organ_space_obgyn_abdominal_pain: existing.organ_space_obgyn_abdominal_pain ?? false,
    chapter17_flags: existing.chapter17_flags ?? {},
    has_blood_culture_positive: existing.has_blood_culture_positive ?? false,
    blood_ssi_pathogen_matches: existing.blood_ssi_pathogen_matches ?? false,
    loai_phau_thuat_nhsn: existing.loai_phau_thuat_nhsn || "COLO",
    ma_qr_cssd_lien_quan: existing.ma_qr_cssd_lien_quan,
  };
}
