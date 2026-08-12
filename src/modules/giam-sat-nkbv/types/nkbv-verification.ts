export interface DepartmentStay {
  khoa_id: string;
  ten_khoa: string;
  /** Mã khoa — dùng hiển thị compact khi có */
  ma_khoa?: string;
  ngay_vao: string;
  ngay_ra?: string;
}

/** Liên kết Index XN / disposition hàng đợi «chưa phân tích». */
export type NkbvAnalysisIndexFields = {
  /** UUID `nkbv_fact_vi_sinh` khi Index = XN (+) */
  index_vi_sinh_id?: string | null;
  /** Bỏ qua có chủ đích — XN ra khỏi hàng đợi, không tạo HAI */
  analysis_disposition?: "BO_QUA" | null;
  analysis_skip_reason?: string | null;
};

export interface BsiVerificationData extends NkbvAnalysisIndexFields {
  is_fungi_respiratory: boolean; // Loại nấm hô hấp cộng đồng (Blastomyces, Histoplasma...)
  pathogen_name: string; // Tên vi sinh vật phân lập được
  pathogen_type: 'RECOGNIZED' | 'COMMON_COMMENSAL';
  commensal_culture_count: number; // Số lần cấy dương tính vi hệ da ở các lần lấy riêng biệt
  commensal_drawn_separate: boolean; // Lấy mẫu ở các thời điểm/vị trí khác nhau
  /** Legacy OR — vẫn sync từ has_fever|chills|hypotension khi lưu form. */
  symptoms_window_7days: boolean;
  /** SSOT §6 — tách triệu chứng LCBI 2 */
  has_fever?: boolean;
  has_chills?: boolean;
  has_hypotension?: boolean;
  /** LCBI 3 ≤1 tuổi (tối thiểu) */
  is_infant_le1?: boolean;
  has_hypothermia?: boolean;
  has_apnea?: boolean;
  has_bradycardia?: boolean;
  cvc_placed_days: number; // Số ngày đặt CVC
  cvc_active_on_event: boolean; // CVC còn lưu trong ngày DOE hoặc ngày ngay trước đó
  device_placed_date?: string; // Ngày đặt CVC (Mới)
  device_removed_date?: string; // Ngày rút CVC (Mới, nếu có)
  is_neutropenia: boolean; // ANC < 500 hoặc ghép tế bào gốc
  has_hsct_or_gvhd?: boolean;
  anc_wbc_lt_500_ge_2d?: boolean;
  /** MBI-LCBI — tiêu chảy nặng ≥1L/24h (hoặc ≥20 mL/kg/24h) trong 7 ngày trước cấy máu (+) */
  has_severe_diarrhea_mbi?: boolean;
  is_intestinal_pathogen: boolean; // Tác nhân đường ruột (Candida, Enterococcus, Bacteroides...)
  has_localized_infection: boolean; // Có ổ nhiễm trùng tại chỗ khác đạt chuẩn CDC (VAP, CAUTI, SSI...)
  localized_pathogen_matches: boolean; // Vi khuẩn trong máu trùng với vi khuẩn tại ổ nhiễm trùng tại chỗ
  is_in_sbap_window: boolean; // Cấy máu được lấy trong khung SBAP 14 ngày của ca bệnh tại chỗ
  blood_mandatory_for_localized: boolean; // Cấy máu là tiêu chuẩn bắt buộc cho ổ nhiễm trùng kia (vd: IAB 3b)
  /** Shared SBSI W1–W2 optional facts */
  localized_site_type?: "UTI" | "PNEU" | "SSI" | "OTHER";
  localized_pathogen_name?: string;
  blood_collection_date?: string;
  lung_or_pleural_match?: boolean;

  // Dynamic fields for CDC timeline and location attribution
  treatment_history?: DepartmentStay[];
  symptom_dates?: Record<string, string>;
  calculated_doe?: string;
  calculated_iwp_start?: string;
  calculated_iwp_end?: string;
  calculated_sbap_start?: string;
  calculated_sbap_end?: string;
  attributed_khoa_id?: string;
  attributed_khoa_name?: string;
  hai_status?: 'HAI' | 'POA';
}

/** Một ngày theo dõi máy thở (PEEP/FiO2 tối thiểu). */
export type VaeVentDailyParam = {
  date: string;
  peep_min: number | null;
  fio2_min: number | null;
};

export interface VaeVerificationData extends NkbvAnalysisIndexFields {
  patient_age: number; // Tuổi bệnh nhân (>= 18 tuổi mới áp dụng VAE)
  vent_days: number; // Số ngày thở máy liên tục
  device_placed_date?: string; // Ngày bắt đầu thở máy (Mới)
  device_removed_date?: string; // Ngày dừng thở máy (Mới, nếu có)
  /** Bảng PEEP/FiO2 min theo ngày — cò súng VAE (vent-first). */
  vent_daily_params?: VaeVentDailyParam[];
  has_stable_baseline_peep_fio2: boolean; // Có giai đoạn ổn định: PEEP/FiO2 tối thiểu ổn định hoặc giảm trong >= 2 ngày
  peep_increase_ge_3: boolean; // PEEP tối thiểu tăng >= 3 cmH2O trong >= 2 ngày liên tiếp ngay sau đó
  fio2_increase_ge_20: boolean; // FiO2 tối thiểu tăng >= 0.20 (20%) trong >= 2 ngày liên tiếp ngay sau đó
  
  // IVAC criteria (5-day window: DOE +/- 2 days)
  temp_fever_or_hypothermia: boolean; // Sốt > 38°C hoặc hạ thân nhiệt < 36°C
  wbc_abnormal: boolean; // Bạch cầu >= 12,000 hoặc <= 4,000/mm3
  new_antimicrobial_ge_4days: boolean; // Kháng sinh mới khởi đầu trong window và dùng liên tục >= 4 ngày
  
  // PVAP criteria (5-day window) — cấy chỉ nâng cấp, không phải cò súng VAE
  has_purulent_sputum_and_positive_culture: boolean; // Đờm mủ (Gram >= 25 BCĐN và <= 10 tb vảy) + Cấy dịch hô hấp (+)
  has_quantitative_culture_positive: boolean; // Cấy định lượng đạt ngưỡng (BAL >= 10^4, ETA >= 10^5 CFU/ml)
  has_respiratory_viral_or_pathogen_test_positive: boolean; // Test virus/Legionella (+) hoặc sinh thiết phổi phù hợp
  /** Ngày trên APRV/HFV — loại khỏi VAC eligibility (NHSN). */
  on_aprv_or_hfv?: boolean;
  /** Ngày trên ECMO — loại khỏi giám sát VAE. */
  on_ecmo?: boolean;
  
  // Non-ventilated adult / pediatric PNEU criteria (VAP lâm sàng / HAP)
  /** Cò súng mở IWP: cấy đờm trước hoặc X-quang trước. */
  pneu_trigger?: "CULTURE" | "IMAGING";
  has_chest_imaging_abnormal: boolean; // Có X-quang/CT ngực thâm nhiễm mới/tiến triển/dai dẳng, đông đặc, tạo hang
  has_cardiopulmonary_disease_underlying: boolean; // Có bệnh lý tim phổi nền (nếu có cần >= 2 phim, nếu không chỉ cần 1 phim)
  imaging_films_count: number; // Số lượng phim X-quang/CT ngực đạt chuẩn bất thường
  /** Legacy / derived — true nếu ≥1 atom toàn thân (hoặc ca cũ chỉ tick gộp). */
  fever_or_wbc_abnormal: boolean;
  /** Atom PNEU — sốt > 38°C */
  has_pneu_fever?: boolean;
  /** Atom PNEU — hạ thân nhiệt < 36°C */
  has_pneu_hypothermia?: boolean;
  /** Atom PNEU — WBC ≤4000 hoặc ≥12000/mm³ */
  has_pneu_wbc_abnormal?: boolean;
  altered_mental_status_ge_70yo: boolean; // Lú lẫn/thay đổi ý thức ở người >= 70 tuổi
  respiratory_symptoms_count: number; // Số triệu chứng tại chỗ (suy từ checklist hoặc nhập tay)
  has_new_cough?: boolean;
  has_purulent_sputum_symptom?: boolean;
  has_rales_or_wheeze?: boolean;
  has_worsening_gas_exchange?: boolean;
  /** Thở khó — tách khỏi thở nhanh (IWP tối thiểu). */
  has_dyspnea?: boolean;
  /** Thở nhanh / tachypnea. */
  has_tachypnea?: boolean;
  /** PNU3 immunocompromised — ho ra máu */
  has_hemoptysis?: boolean;
  /** PNU3 — đau ngực kiểu màng phổi */
  has_pleuritic_chest_pain?: boolean;
  /** PNEU ≤1 tuổi — ngưng thở / phập phồng cánh mũi / thở rên */
  has_infant_respiratory_distress?: boolean;
  /** PNEU ≤1 tuổi — nhịp chậm (<100) hoặc nhanh (>170) */
  has_infant_hr_abnormal?: boolean;
  /**
   * Tier vi sinh PNU (đồng bộ từ lab-first hoặc legacy chọn tay).
   * Lab-first: ưu tiên fact `pneu_lab_*` qua `derivePneuLabTier`.
   */
  microbiology_evidence: 'NONE' | 'PNU2' | 'PNU3';
  /** Loại mẫu lab PNEU — Table 2/3 (lab-first). */
  pneu_lab_specimen?:
    | 'NONE'
    | 'BLOOD'
    | 'PLEURAL'
    | 'LUNG_TISSUE'
    | 'BAL'
    | 'PBAL'
    | 'PSB'
    | 'ETA'
    | 'SPUTUM'
    | 'OTHER_LRT';
  pneu_lab_cfu_per_ml?: number | null;
  pneu_lab_semi_quant?:
    | 'NONE'
    | 'LIGHT'
    | 'MODERATE'
    | 'HEAVY'
    | 'MANY'
    | 'PLUS_2'
    | 'PLUS_3'
    | 'PLUS_4';
  pneu_lab_organism?: string;
  pneu_lab_is_normal_flora?: boolean;
  /** Table 3 gộp (derived từ atom hoặc tick tay). */
  pneu_lab_table3_positive?: boolean;
  pneu_t3_influenza?: boolean;
  pneu_t3_rsv?: boolean;
  pneu_t3_other_virus?: boolean;
  pneu_t3_legionella?: boolean;
  pneu_t3_mycoplasma?: boolean;
  pneu_t3_chlamydia?: boolean;
  pneu_t3_bordetella?: boolean;
  pneu_lab_bal_intracellular_ge_5pct?: boolean;
  pneu_lab_histopath_positive?: boolean;
  /** Cửa PNU3 gộp (derived từ atom IC hoặc tick tay). */
  pneu_is_immunocompromised?: boolean;
  pneu_ic_neutropenia?: boolean;
  pneu_ic_leukemia_lymphoma?: boolean;
  pneu_ic_hiv_cd4_lt_200?: boolean;
  pneu_ic_splenectomy?: boolean;
  pneu_ic_solid_organ_or_hsct?: boolean;
  pneu_ic_chemotherapy?: boolean;
  pneu_ic_steroid_ge_14d?: boolean;
  /** Ngoại lệ PNU3: Candida máu khớp LRT trong IWP. */
  pneu_candida_blood_and_lrt_match?: boolean;

  /** PVAP Secondary BSI (optional) */
  has_blood_culture_in_event_period?: boolean;
  blood_collection_date?: string;
  blood_organism?: string;
  respiratory_organism?: string;
  blood_respiratory_pathogen_matches?: boolean;
  lung_or_pleural_match?: boolean;

  // Dynamic fields for CDC timeline and location attribution
  treatment_history?: DepartmentStay[];
  symptom_dates?: Record<string, string>;
  calculated_doe?: string;
  calculated_iwp_start?: string;
  calculated_iwp_end?: string;
  calculated_sbap_start?: string;
  calculated_sbap_end?: string;
  attributed_khoa_id?: string;
  attributed_khoa_name?: string;
  hai_status?: 'HAI' | 'POA';
}

export interface UtiVerificationData extends NkbvAnalysisIndexFields {
  urine_cfu_count: number; // Số lượng vi khuẩn trong nước tiểu (ví dụ: >= 10^5 CFU/ml)
  pathogen_count: number; // Số lượng tác nhân vi sinh phân lập được (nếu > 2 -> tạp nhiễm)
  has_fungi_yeast_parasite: boolean; // Có chứa Nấm Candida, nấm men, nấm mốc hoặc ký sinh trùng
  foley_placed_days: number; // Số ngày đặt Foley liên tục
  foley_active_on_event: boolean; // Ống Foley còn lưu vào DOE hoặc mới rút vào ngày trước đó
  /** Tick tường minh SSOT §7 — ưu tiên hơn suy từ dates nếu set. */
  foley_present_doe_or_prior?: boolean;
  device_placed_date?: string; // Ngày đặt ống thông tiểu Foley (Mới)
  device_removed_date?: string; // Ngày rút ống thông tiểu Foley (Mới, nếu có)
  
  // SUTI symptoms (in 7-day window)
  has_fever: boolean; // Sốt > 38.0°C
  has_suprapubic_tenderness: boolean; // Đau tức vùng trên xương mu (không do nguyên nhân khác)
  has_costovertebral_pain: boolean; // Đau tức hố thắt lưng (không do nguyên nhân khác)
  has_dysuria: boolean; // Tiểu buốt (chỉ tính nếu không đặt Foley)
  /** Tiểu gấp — tách khỏi dysuria (N-G1). */
  has_urgency?: boolean;
  /** Tiểu rắt / frequency — tách khỏi dysuria (N-G1). */
  has_frequency?: boolean;
  /** SUTI 2 ≤1 tuổi (tối thiểu) */
  is_infant_le1?: boolean;
  has_infant_hypothermia?: boolean;
  has_infant_apnea?: boolean;
  has_infant_bradycardia?: boolean;
  has_infant_lethargy?: boolean;
  has_infant_vomiting?: boolean;
  
  // ABUTI criteria (Asymptomatic Bacteriuria with secondary BSI)
  has_blood_culture_positive_in_window: boolean; // Có cấy máu dương tính trong khung 7 ngày
  blood_urine_pathogen_matches: boolean; // Tác nhân cấy máu trùng với tác nhân cấy nước tiểu >= 10^5 CFU/ml
  blood_collection_date?: string;
  blood_organism?: string;
  urine_organism?: string;

  // Dynamic fields for CDC timeline and location attribution
  treatment_history?: DepartmentStay[];
  symptom_dates?: Record<string, string>;
  calculated_doe?: string;
  calculated_iwp_start?: string;
  calculated_iwp_end?: string;
  calculated_sbap_start?: string;
  calculated_sbap_end?: string;
  attributed_khoa_id?: string;
  attributed_khoa_name?: string;
  hai_status?: 'HAI' | 'POA';
}

export interface SsiVerificationData extends NkbvAnalysisIndexFields {
  days_since_surgery: number; // Số ngày tính từ lúc mổ đến ngày phát hiện (DOE)
  surgery_date?: string;
  doe_date?: string;
  /** Present at time of surgery */
  is_patos?: boolean;
  return_to_or_within_24h?: boolean;
  /** ≤1 tuổi — nhánh Ch.17 infant */
  is_infant_le1?: boolean;
  /** Fallback khi chưa chọn mã PT NHSN — không còn nguồn chính cho SP 30/90. */
  has_implant: boolean;
  ssi_depth: 'SUPERFICIAL' | 'DEEP' | 'ORGAN_SPACE' | 'NONE';
  /** Mã loại sự kiện NHSN: SIP | SIS | DIP | DIS | ORGAN_SPACE */
  ssi_event_type?: string;
  /** Mã vị trí Organ/Space Ch.17 — bắt buộc khi depth/event = ORGAN_SPACE */
  organ_space_site?: string;

  // Superficial SSI criteria
  superficial_purulent_drainage: boolean; // Chảy mủ từ vết rạch nông
  superficial_culture_positive: boolean; // Cấy dịch/mô lấy vô khuẩn từ vết mổ nông dương tính
  superficial_opened_with_inflammation: boolean; // Phẫu thuật viên mở vết mổ nông + bệnh nhân có ít nhất 1 dấu hiệu sưng/nóng/đỏ/đau
  superficial_physician_diagnosis: boolean; // Bác sĩ trực tiếp chẩn đoán là SSI nông
  
  // Deep SSI criteria
  deep_purulent_drainage: boolean; // Chảy mủ từ vết rạch sâu
  deep_dehisced_or_opened_with_symptoms: boolean; // Vết mổ tự toác/mở sâu + bệnh nhân sốt > 38°C hoặc đau tại chỗ (cấy không âm tính)
  deep_abscess_imaging_pathology: boolean; // Phát hiện ổ áp xe/nhiễm khuẩn mô sâu qua mổ lại, CĐHA, hoặc giải phẫu bệnh
  
  // Organ/Space SSI criteria
  organ_space_purulent_drainage: boolean; // Chảy mủ từ dẫn lưu organ/space
  organ_space_culture_positive: boolean; // Cấy dịch/mô lấy vô khuẩn từ organ/space dương tính
  organ_space_abscess_imaging_pathology: boolean; // Phát hiện áp xe trong organ/space qua mổ lại, CĐHA, hoặc giải phẫu bệnh
  /** Ngoại lệ CSEC/HYST/VHYS — đau bụng / tăng nhạy cảm đau bụng sau mổ (OREP/EMET/VCUF) */
  organ_space_obgyn_abdominal_pain?: boolean;
  /**
   * Cờ triệu chứng Chương 17 theo site (key = form_field catalog `ch17_*`).
   * Dùng khi Organ/Space chọn mã site NHSN.
   */
  chapter17_flags?: Record<string, boolean>;
  
  // Secondary BSI criteria
  has_blood_culture_positive: boolean; // Có cấy máu dương tính
  blood_ssi_pathogen_matches: boolean; // Vi khuẩn cấy máu trùng với vi khuẩn cấy vết mổ
  blood_collection_date?: string;
  blood_organism?: string;
  wound_organism?: string;
  blood_mandatory_for_organ_space?: boolean;

  // Surgical details — mã PT NHSN (namespace A; khác mã site Organ/Space)
  loai_phau_thuat_nhsn: string;

  /** Mã QR bộ dụng cụ CSSD (chu trình) — liên kết truy vết SSI ↔ quy trình. */
  ma_qr_cssd_lien_quan?: string;

  // Dynamic fields for CDC timeline and location attribution
  treatment_history?: DepartmentStay[];
  symptom_dates?: Record<string, string>;
  calculated_doe?: string;
  calculated_iwp_start?: string;
  calculated_iwp_end?: string;
  calculated_sbap_start?: string;
  calculated_sbap_end?: string;
  attributed_khoa_id?: string;
  attributed_khoa_name?: string;
  hai_status?: 'HAI' | 'POA';
}

/** Ca nhiễm khuẩn chuyên biệt Chương 17 (độc lập, không SSI). */
export interface Ch17VerificationData extends NkbvAnalysisIndexFields {
  /** Mã Specific Type: BONE, MEN, IAB, … */
  ch17_type_code: string;
  chapter17_flags?: Record<string, boolean>;
  is_infant_le1?: boolean;
  procedure_code?: string | null;
  /** Hierarchy / shunt context (optional) */
  days_since_shunt?: number | null;
  post_cardiac_mediastinitis_with_sternum?: boolean;
  men_with_ic_post_op_abscess?: boolean;
  pneu_met?: boolean;
  ssi_lung_after_thor?: boolean;
  discharge_date?: string | null;
  treatment_history?: DepartmentStay[];
  symptom_dates?: Record<string, string>;
  calculated_doe?: string;
  calculated_iwp_start?: string;
  calculated_iwp_end?: string;
  calculated_sbap_start?: string;
  calculated_sbap_end?: string;
  attributed_khoa_id?: string;
  attributed_khoa_name?: string;
  hai_status?: "HAI" | "POA";
}

export type NkbvVerificationPayload =
  | { type: "BSI"; data: BsiVerificationData }
  | { type: "VAE"; data: VaeVerificationData }
  | { type: "UTI"; data: UtiVerificationData }
  | { type: "SSI"; data: SsiVerificationData }
  | { type: "CH17"; data: Ch17VerificationData };
