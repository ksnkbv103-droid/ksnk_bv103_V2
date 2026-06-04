export interface DepartmentStay {
  khoa_id: string;
  ten_khoa: string;
  ngay_vao: string;
  ngay_ra?: string;
}

export interface BsiVerificationData {
  is_fungi_respiratory: boolean; // Loại nấm hô hấp cộng đồng (Blastomyces, Histoplasma...)
  pathogen_name: string; // Tên vi sinh vật phân lập được
  pathogen_type: 'RECOGNIZED' | 'COMMON_COMMENSAL';
  commensal_culture_count: number; // Số lần cấy dương tính vi hệ da ở các lần lấy riêng biệt
  commensal_drawn_separate: boolean; // Lấy mẫu ở các thời điểm/vị trí khác nhau
  symptoms_window_7days: boolean; // Sốt > 38.0°C, rét run, hoặc hạ huyết áp trong vòng 7 ngày
  cvc_placed_days: number; // Số ngày đặt CVC
  cvc_active_on_event: boolean; // CVC còn lưu trong ngày DOE hoặc ngày ngay trước đó
  device_placed_date?: string; // Ngày đặt CVC (Mới)
  device_removed_date?: string; // Ngày rút CVC (Mới, nếu có)
  is_neutropenia: boolean; // ANC < 500 hoặc ghép tế bào gốc
  is_intestinal_pathogen: boolean; // Tác nhân đường ruột (Candida, Enterococcus, Bacteroides...)
  has_localized_infection: boolean; // Có ổ nhiễm trùng tại chỗ khác đạt chuẩn CDC (VAP, CAUTI, SSI...)
  localized_pathogen_matches: boolean; // Vi khuẩn trong máu trùng với vi khuẩn tại ổ nhiễm trùng tại chỗ
  is_in_sbap_window: boolean; // Cấy máu được lấy trong khung SBAP 14 ngày của ca bệnh tại chỗ
  blood_mandatory_for_localized: boolean; // Cấy máu là tiêu chuẩn bắt buộc cho ổ nhiễm trùng kia (vd: IAB 3b)
  
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

export interface VaeVerificationData {
  patient_age: number; // Tuổi bệnh nhân (>= 18 tuổi mới áp dụng VAE)
  vent_days: number; // Số ngày thở máy liên tục
  device_placed_date?: string; // Ngày bắt đầu thở máy (Mới)
  device_removed_date?: string; // Ngày dừng thở máy (Mới, nếu có)
  has_stable_baseline_peep_fio2: boolean; // Có giai đoạn ổn định: PEEP/FiO2 tối thiểu ổn định hoặc giảm trong >= 2 ngày
  peep_increase_ge_3: boolean; // PEEP tối thiểu tăng >= 3 cmH2O trong >= 2 ngày liên tiếp ngay sau đó
  fio2_increase_ge_20: boolean; // FiO2 tối thiểu tăng >= 0.20 (20%) trong >= 2 ngày liên tiếp ngay sau đó
  
  // IVAC criteria (5-day window: DOE +/- 2 days)
  temp_fever_or_hypothermia: boolean; // Sốt > 38°C hoặc hạ thân nhiệt < 36°C
  wbc_abnormal: boolean; // Bạch cầu >= 12,000 hoặc <= 4,000/mm3
  new_antimicrobial_ge_4days: boolean; // Kháng sinh mới khởi đầu trong window và dùng liên tục >= 4 ngày
  
  // PVAP criteria (5-day window)
  has_purulent_sputum_and_positive_culture: boolean; // Đờm mủ (Gram >= 25 BCĐN và <= 10 tb vảy) + Cấy dịch hô hấp (+)
  has_quantitative_culture_positive: boolean; // Cấy định lượng đạt ngưỡng (BAL >= 10^4, ETA >= 10^5 CFU/ml)
  has_respiratory_viral_or_pathogen_test_positive: boolean; // Test virus/Legionella (+) hoặc sinh thiết phổi phù hợp
  
  // Non-ventilated adult / pediatric PNEU criteria
  has_chest_imaging_abnormal: boolean; // Có X-quang/CT ngực thâm nhiễm mới/tiến triển/dai dẳng, đông đặc, tạo hang
  has_cardiopulmonary_disease_underlying: boolean; // Có bệnh lý tim phổi nền (nếu có cần >= 2 phim, nếu không chỉ cần 1 phim)
  imaging_films_count: number; // Số lượng phim X-quang/CT ngực đạt chuẩn bất thường
  fever_or_wbc_abnormal: boolean; // Triệu chứng toàn thân (Sốt > 38°C, hạ thân nhiệt < 36°C, hoặc WBC bất thường)
  altered_mental_status_ge_70yo: boolean; // Lú lẫn/thay đổi ý thức ở người >= 70 tuổi
  respiratory_symptoms_count: number; // Số triệu chứng tại chỗ (đờm mủ, ho mới/khó thở, rale phổi, khí máu suy giảm PaO2/FiO2)
  microbiology_evidence: 'NONE' | 'PNU2' | 'PNU3'; // Bằng chứng vi sinh nâng cấp

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

export interface UtiVerificationData {
  urine_cfu_count: number; // Số lượng vi khuẩn trong nước tiểu (ví dụ: >= 10^5 CFU/ml)
  pathogen_count: number; // Số lượng tác nhân vi sinh phân lập được (nếu > 2 -> tạp nhiễm)
  has_fungi_yeast_parasite: boolean; // Có chứa Nấm Candida, nấm men, nấm mốc hoặc ký sinh trùng
  foley_placed_days: number; // Số ngày đặt Foley liên tục
  foley_active_on_event: boolean; // Ống Foley còn lưu vào DOE hoặc mới rút vào ngày trước đó
  device_placed_date?: string; // Ngày đặt ống thông tiểu Foley (Mới)
  device_removed_date?: string; // Ngày rút ống thông tiểu Foley (Mới, nếu có)
  
  // SUTI symptoms (in 7-day window)
  has_fever: boolean; // Sốt > 38.0°C
  has_suprapubic_tenderness: boolean; // Đau tức vùng trên xương mu (không do nguyên nhân khác)
  has_costovertebral_pain: boolean; // Đau tức hố thắt lưng (không do nguyên nhân khác)
  has_dysuria: boolean; // Tiểu buốt / Tiểu rắt / Tiểu gấp (chỉ tính nếu không đặt Foley)
  
  // ABUTI criteria (Asymptomatic Bacteriuria with secondary BSI)
  has_blood_culture_positive_in_window: boolean; // Có cấy máu dương tính trong khung 7 ngày
  blood_urine_pathogen_matches: boolean; // Tác nhân cấy máu trùng với tác nhân cấy nước tiểu >= 10^5 CFU/ml

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

export interface SsiVerificationData {
  days_since_surgery: number; // Số ngày tính từ lúc mổ đến ngày phát hiện (DOE)
  has_implant: boolean; // Có đặt vật liệu nhân tạo (Implant) cấy ghép hay không (nếu có: cửa sổ 90 ngày, không: 30 ngày)
  ssi_depth: 'SUPERFICIAL' | 'DEEP' | 'ORGAN_SPACE' | 'NONE'; // Độ sâu của SSI
  
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
  
  // Secondary BSI criteria
  has_blood_culture_positive: boolean; // Có cấy máu dương tính
  blood_ssi_pathogen_matches: boolean; // Vi khuẩn cấy máu trùng với vi khuẩn cấy vết mổ
  
  // Surgical details
  loai_phau_thuat_nhsn: string; // Loại phẫu thuật theo NHSN (VD: COLO, KPRO, HPRO, CARD)

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

export type NkbvVerificationPayload = 
  | { type: 'BSI'; data: BsiVerificationData }
  | { type: 'VAE'; data: VaeVerificationData }
  | { type: 'UTI'; data: UtiVerificationData }
  | { type: 'SSI'; data: SsiVerificationData };
