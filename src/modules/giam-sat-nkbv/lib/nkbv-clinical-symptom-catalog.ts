/**
 * SSOT triệu chứng lâm sàng NKBV (CDC NHSN 2025).
 * Identity + nhãn + cổng tuổi/dụng cụ + ánh xạ form_field / criteria_key.
 * Không thay logic classify — engine vẫn đọc verification booleans.
 */

export type NkbvSymptomSyndrome =
  | "BSI"
  | "UTI"
  | "PNEU"
  | "VAE"
  | "SSI"
  | "CH17_BJ"
  | "CH17_CNS"
  | "CH17_CVS"
  | "CH17_EENT"
  | "CH17_GI"
  | "CH17_REPR"
  | "CH17_SST";

export type NkbvSymptomWindow = "IWP" | "EVENT_PERIOD" | "SSI_SURVEILLANCE" | "NONE";

export type NkbvSymptomAgeGate =
  | "any"
  | "le1"
  | "gt1"
  | "gt1_le12"
  | "ge70"
  | "adult_or_child";

export type NkbvSymptomRuntimeStatus = "wired" | "catalog_only" | "bundled_view";

export type NkbvChecklistGate = "BSI" | "UTI" | "HAP" | "VAP" | "VAE" | "SSI";

export type NkbvClinicalSymptomDef = {
  id: string;
  name_en: string;
  name_vi: string;
  threshold_note?: string;
  syndromes: readonly NkbvSymptomSyndrome[];
  checklist_gates: readonly NkbvChecklistGate[];
  age_gate: NkbvSymptomAgeGate;
  /** voiding symptoms — chỉ khi không Foley */
  device_gate?: "no_foley";
  ssi_depth?: "SUPERFICIAL" | "DEEP" | "ORGAN_SPACE";
  window: NkbvSymptomWindow;
  doe_eligible: boolean;
  /** Khóa trên verification / symptom_dates — null = chưa wire form */
  form_field: string | null;
  /** Khóa timeline BA (NkbvCriteriaKey) — null = chưa có trên grid */
  criteria_key: string | null;
  group: string;
  runtime_status: NkbvSymptomRuntimeStatus;
  /** Dòng hô hấp PNEU (1–4) để đếm ≥2 dòng khác nhau */
  pneu_resp_line?: 1 | 2 | 3 | 4;
  ch17_site?: string;
};

export const NKBV_CLINICAL_SYMPTOMS: readonly NkbvClinicalSymptomDef[] = [
  // ─── Shared systemic ───────────────────────────────────────────────────────
  {
    id: "sx.fever_gt_38",
    name_en: "Fever >38.0°C",
    name_vi: "Sốt > 38,0°C",
    threshold_note: "> 38.0°C (hoặc > 100.4°F)",
    syndromes: ["BSI", "UTI", "SSI"],
    checklist_gates: ["BSI", "UTI", "SSI"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_fever",
    criteria_key: "fever",
    group: "Toàn thân",
    runtime_status: "wired",
  },
  {
    id: "sx.pneu_fever",
    name_en: "Fever >38.0°C (PNEU)",
    name_vi: "Sốt > 38,0°C",
    threshold_note: "> 38.0°C (hoặc > 100.4°F)",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_pneu_fever",
    criteria_key: "fever_or_wbc",
    group: "Toàn thân PNEU",
    runtime_status: "wired",
  },
  {
    id: "sx.pneu_hypothermia",
    name_en: "Hypothermia <36.0°C (PNEU)",
    name_vi: "Hạ thân nhiệt < 36,0°C",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_pneu_hypothermia",
    criteria_key: "fever_or_wbc",
    group: "Toàn thân PNEU",
    runtime_status: "wired",
  },
  {
    id: "sx.pneu_wbc_abnormal",
    name_en: "Abnormal WBC (PNEU)",
    name_vi: "Bạch cầu ≤ 4.000 hoặc ≥ 12.000/mm³",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_pneu_wbc_abnormal",
    criteria_key: "fever_or_wbc",
    group: "Toàn thân PNEU",
    runtime_status: "wired",
  },
  {
    id: "sx.fever_or_wbc_pneu_legacy",
    name_en: "Fever / hypothermia / abnormal WBC (legacy bundle)",
    name_vi: "Sốt / hạ thân nhiệt / WBC (gộp — ca cũ)",
    threshold_note: "Derived từ atom; giữ tương thích JSON cũ",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "fever_or_wbc_abnormal",
    criteria_key: "fever_or_wbc",
    group: "Toàn thân PNEU",
    runtime_status: "bundled_view",
  },
  {
    id: "sx.altered_mental_ge70",
    name_en: "Altered mental status (≥70y)",
    name_vi: "Thay đổi trạng thái tâm thần (≥70 tuổi)",
    threshold_note: "Không rõ nguyên nhân khác; ≥70 tuổi",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "ge70",
    window: "IWP",
    doe_eligible: true,
    form_field: "altered_mental_status_ge_70yo",
    criteria_key: "altered_mental_ge70",
    group: "Toàn thân PNEU",
    runtime_status: "wired",
  },
  {
    id: "sx.vae_temp_fever_or_hypo",
    name_en: "Fever or hypothermia (IVAC)",
    name_vi: "Sốt > 38,0°C hoặc hạ thân nhiệt < 36,0°C",
    syndromes: ["VAE"],
    checklist_gates: ["VAE"],
    age_gate: "any",
    window: "EVENT_PERIOD",
    doe_eligible: false,
    form_field: "temp_fever_or_hypothermia",
    /** BA IVAC dùng chung fever_or_wbc — reverse map theo syndrome=VAE */
    criteria_key: "fever_or_wbc",
    group: "IVAC",
    runtime_status: "wired",
  },
  {
    id: "sx.vae_wbc_abnormal",
    name_en: "Abnormal WBC (IVAC)",
    name_vi: "Bạch cầu ≤ 4.000 hoặc ≥ 12.000/mm³",
    syndromes: ["VAE"],
    checklist_gates: ["VAE"],
    age_gate: "any",
    window: "EVENT_PERIOD",
    doe_eligible: false,
    form_field: "wbc_abnormal",
    criteria_key: "fever_or_wbc",
    group: "IVAC",
    runtime_status: "wired",
  },

  // ─── BSI LCBI 2 / 3 / MBI ──────────────────────────────────────────────────
  {
    id: "sx.bsi_chills",
    name_en: "Chills",
    name_vi: "Rét run (chills)",
    syndromes: ["BSI"],
    checklist_gates: ["BSI"],
    age_gate: "adult_or_child",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_chills",
    criteria_key: "chills",
    group: "LCBI 2",
    runtime_status: "wired",
  },
  {
    id: "sx.bsi_hypotension",
    name_en: "Hypotension",
    name_vi: "Tụt huyết áp",
    syndromes: ["BSI"],
    checklist_gates: ["BSI"],
    age_gate: "adult_or_child",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_hypotension",
    criteria_key: "hypotension",
    group: "LCBI 2",
    runtime_status: "wired",
  },
  {
    id: "sx.bsi_hypothermia",
    name_en: "Hypothermia (≤1y LCBI 3)",
    name_vi: "Hạ thân nhiệt (< 36,0°C)",
    syndromes: ["BSI"],
    checklist_gates: ["BSI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_hypothermia",
    criteria_key: "bsi_hypothermia",
    group: "LCBI 3",
    runtime_status: "wired",
  },
  {
    id: "sx.bsi_apnea",
    name_en: "Apnea (≤1y LCBI 3)",
    name_vi: "Cơn ngưng thở (apnea)",
    syndromes: ["BSI"],
    checklist_gates: ["BSI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_apnea",
    criteria_key: "bsi_apnea",
    group: "LCBI 3",
    runtime_status: "wired",
  },
  {
    id: "sx.bsi_bradycardia",
    name_en: "Bradycardia (≤1y LCBI 3)",
    name_vi: "Nhịp tim chậm (bradycardia)",
    syndromes: ["BSI"],
    checklist_gates: ["BSI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_bradycardia",
    criteria_key: "bsi_bradycardia",
    group: "LCBI 3",
    runtime_status: "wired",
  },
  {
    id: "sx.bsi_mbi_severe_diarrhea",
    name_en: "Severe diarrhea (MBI-LCBI)",
    name_vi: "Tiêu chảy nặng (≥1 L/24h hoặc ≥20 mL/kg/24h)",
    threshold_note: "Khởi phát trong 7 ngày trước ngày cấy máu (+)",
    syndromes: ["BSI"],
    checklist_gates: ["BSI"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: false,
    form_field: "has_severe_diarrhea_mbi",
    criteria_key: null,
    group: "MBI-LCBI",
    runtime_status: "wired",
  },
  {
    id: "sx.bsi_legacy_or",
    name_en: "Legacy symptoms OR window",
    name_vi: "Triệu chứng cửa sổ (legacy)",
    syndromes: ["BSI"],
    checklist_gates: ["BSI"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "symptoms_window_7days",
    criteria_key: null,
    group: "Legacy",
    runtime_status: "wired",
  },

  // ─── UTI ───────────────────────────────────────────────────────────────────
  {
    id: "sx.uti_suprapubic",
    name_en: "Suprapubic tenderness",
    name_vi: "Đau hoặc căng tức vùng trên xương mu",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_suprapubic_tenderness",
    criteria_key: "suprapubic_pain",
    group: "SUTI",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_cva",
    name_en: "Costovertebral angle pain",
    name_vi: "Đau hoặc tăng nhạy cảm đau góc sườn lưng",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "gt1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_costovertebral_pain",
    criteria_key: "cva_pain",
    group: "SUTI",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_dysuria",
    name_en: "Dysuria",
    name_vi: "Tiểu buốt",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "gt1",
    device_gate: "no_foley",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_dysuria",
    criteria_key: "dysuria",
    group: "Voiding",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_urgency",
    name_en: "Urgency",
    name_vi: "Tiểu gấp",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "gt1",
    device_gate: "no_foley",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_urgency",
    criteria_key: "urgency",
    group: "Voiding",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_frequency",
    name_en: "Frequency",
    name_vi: "Tiểu rắt",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "gt1",
    device_gate: "no_foley",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_frequency",
    criteria_key: "frequency",
    group: "Voiding",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_infant_hypothermia",
    name_en: "Hypothermia ≤1y (SUTI 2)",
    name_vi: "Hạ thân nhiệt (< 36,0°C) — ≤1 tuổi",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_infant_hypothermia",
    criteria_key: "infant_hypothermia",
    group: "SUTI 2",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_infant_apnea",
    name_en: "Apnea ≤1y",
    name_vi: "Cơn ngưng thở — ≤1 tuổi",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_infant_apnea",
    criteria_key: "infant_apnea",
    group: "SUTI 2",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_infant_bradycardia",
    name_en: "Bradycardia ≤1y",
    name_vi: "Nhịp tim chậm — ≤1 tuổi",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_infant_bradycardia",
    criteria_key: "infant_bradycardia",
    group: "SUTI 2",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_infant_lethargy",
    name_en: "Lethargy ≤1y",
    name_vi: "Lờ đờ, ngủ lịm — ≤1 tuổi",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_infant_lethargy",
    criteria_key: "infant_lethargy",
    group: "SUTI 2",
    runtime_status: "wired",
  },
  {
    id: "sx.uti_infant_vomiting",
    name_en: "Vomiting ≤1y",
    name_vi: "Nôn — ≤1 tuổi",
    syndromes: ["UTI"],
    checklist_gates: ["UTI"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_infant_vomiting",
    criteria_key: "infant_vomiting",
    group: "SUTI 2",
    runtime_status: "wired",
  },

  // ─── PNEU respiratory lines + imaging ──────────────────────────────────────
  {
    id: "sx.pneu_imaging",
    name_en: "Chest imaging abnormal",
    name_vi: "XQ/CT phổi thâm nhiễm / đông đặc / hang",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_chest_imaging_abnormal",
    criteria_key: "imaging_chest",
    group: "Hình ảnh",
    runtime_status: "wired",
  },
  {
    id: "sx.pneu_purulent_sputum",
    name_en: "New purulent sputum / change in character",
    name_vi: "Đờm mủ mới / thay đổi tính chất đờm / tăng tiết / hút nhiều hơn",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_purulent_sputum_symptom",
    criteria_key: "purulent_sputum",
    group: "Hô hấp dòng 1",
    runtime_status: "wired",
    pneu_resp_line: 1,
  },
  {
    id: "sx.pneu_new_purulent_alias",
    name_en: "Change in sputum character (alias)",
    name_vi: "Thay đổi tính chất đờm (mủ)",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_purulent_sputum_symptom",
    criteria_key: "new_purulent_sputum",
    group: "Hô hấp dòng 1",
    runtime_status: "wired",
    pneu_resp_line: 1,
  },
  {
    id: "sx.pneu_increased_secretions",
    name_en: "Increased secretions / suctioning",
    name_vi: "Tăng tiết đờm / cần hút nhiều hơn",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_purulent_sputum_symptom",
    criteria_key: "increased_secretions",
    group: "Hô hấp dòng 1",
    runtime_status: "wired",
    pneu_resp_line: 1,
  },
  {
    id: "sx.pneu_cough",
    name_en: "New or worsening cough",
    name_vi: "Ho mới / ho tiến triển nặng lên",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_new_cough",
    criteria_key: "cough",
    group: "Hô hấp dòng 2",
    runtime_status: "wired",
    pneu_resp_line: 2,
  },
  {
    id: "sx.pneu_dyspnea",
    name_en: "Dyspnea",
    name_vi: "Khó thở",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_dyspnea",
    criteria_key: "dyspnea",
    group: "Hô hấp dòng 2",
    runtime_status: "wired",
    pneu_resp_line: 2,
  },
  {
    id: "sx.pneu_tachypnea",
    name_en: "Tachypnea",
    name_vi: "Thở nhanh",
    threshold_note: "Người lớn >25; trẻ >1–≤12: >30; sơ sinh theo tuần tuổi",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_tachypnea",
    criteria_key: "tachypnea",
    group: "Hô hấp dòng 2",
    runtime_status: "wired",
    pneu_resp_line: 2,
  },
  {
    id: "sx.pneu_rales",
    name_en: "Rales / bronchial breath sounds",
    name_vi: "Ran ẩm, ran nổ hoặc tiếng thở phế quản",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_rales_or_wheeze",
    criteria_key: "rales",
    group: "Hô hấp dòng 3",
    runtime_status: "wired",
    pneu_resp_line: 3,
  },
  {
    id: "sx.pneu_worsening_gas",
    name_en: "Worsening gas exchange",
    name_vi: "Suy giảm trao đổi khí (PaO₂/FiO₂ ≤240 / tăng O₂ / máy thở)",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP", "VAE"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_worsening_gas_exchange",
    criteria_key: "worsening_gas",
    group: "Hô hấp dòng 4",
    runtime_status: "wired",
    pneu_resp_line: 4,
  },
  {
    id: "sx.pneu_hemoptysis",
    name_en: "Hemoptysis (PNU3 immunocompromised)",
    name_vi: "Ho ra máu (PNU3)",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_hemoptysis",
    criteria_key: null,
    group: "PNU3 bổ sung",
    runtime_status: "wired",
  },
  {
    id: "sx.pneu_pleuritic_pain",
    name_en: "Pleuritic chest pain (PNU3)",
    name_vi: "Đau ngực kiểu màng phổi (PNU3)",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "any",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_pleuritic_chest_pain",
    criteria_key: null,
    group: "PNU3 bổ sung",
    runtime_status: "wired",
  },
  {
    id: "sx.pneu_infant_apnea_grunting",
    name_en: "Apnea / nasal flaring / grunting (≤1y)",
    name_vi: "Ngưng thở / phập phồng cánh mũi / thở rên (≤1 tuổi)",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_infant_respiratory_distress",
    criteria_key: null,
    group: "PNEU ≤1 tuổi",
    runtime_status: "wired",
  },
  {
    id: "sx.pneu_infant_bradycardia_tachycardia",
    name_en: "Bradycardia or tachycardia (≤1y)",
    name_vi: "Nhịp chậm (<100) hoặc nhanh (>170) — ≤1 tuổi",
    syndromes: ["PNEU"],
    checklist_gates: ["HAP", "VAP"],
    age_gate: "le1",
    window: "IWP",
    doe_eligible: true,
    form_field: "has_infant_hr_abnormal",
    criteria_key: null,
    group: "PNEU ≤1 tuổi",
    runtime_status: "wired",
  },

  // ─── SSI depth ─────────────────────────────────────────────────────────────
  {
    id: "sx.ssi_superficial_purulent",
    name_en: "Superficial purulent drainage",
    name_vi: "Chảy mủ từ đường mổ nông",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "SUPERFICIAL",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "superficial_purulent_drainage",
    criteria_key: "purulent_drainage",
    group: "SSI nông",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_superficial_opened",
    name_en: "Superficial opened with local inflammation",
    name_vi: "Mở vết mổ nông + đau/sưng/đỏ/nóng tại chỗ",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "SUPERFICIAL",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "superficial_opened_with_inflammation",
    criteria_key: "wound_opened",
    group: "SSI nông",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_superficial_md",
    name_en: "Physician diagnosis superficial SSI",
    name_vi: "BS chẩn đoán SSI nông",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "SUPERFICIAL",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "superficial_physician_diagnosis",
    criteria_key: "physician_diagnosis",
    group: "SSI nông",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_superficial_culture",
    name_en: "Superficial culture positive",
    name_vi: "Cấy vết mổ nông (+)",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "SUPERFICIAL",
    window: "SSI_SURVEILLANCE",
    doe_eligible: false,
    form_field: "superficial_culture_positive",
    criteria_key: "wound_culture",
    group: "SSI nông",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_deep_purulent",
    name_en: "Deep soft tissue purulent drainage",
    name_vi: "Chảy mủ từ lớp mô mềm sâu",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "DEEP",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "deep_purulent_drainage",
    criteria_key: "purulent_drainage",
    group: "SSI sâu",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_deep_dehisced",
    name_en: "Deep dehiscence/opened + fever or localized pain",
    name_vi: "Bục/mở sâu + sốt >38°C hoặc đau khu trú",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "DEEP",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "deep_dehisced_or_opened_with_symptoms",
    criteria_key: "wound_opened",
    group: "SSI sâu",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_deep_abscess",
    name_en: "Deep abscess imaging/pathology",
    name_vi: "Áp xe mô sâu (CĐHA / GPB / mổ lại)",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "DEEP",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "deep_abscess_imaging_pathology",
    criteria_key: "abscess_imaging",
    group: "SSI sâu",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_organ_purulent",
    name_en: "Organ/space drain purulent",
    name_vi: "Chảy mủ từ ống dẫn lưu organ/space",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "ORGAN_SPACE",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "organ_space_purulent_drainage",
    criteria_key: "purulent_drainage",
    group: "SSI organ/space",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_organ_culture",
    name_en: "Organ/space culture positive",
    name_vi: "Cấy organ/space (+)",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "ORGAN_SPACE",
    window: "SSI_SURVEILLANCE",
    doe_eligible: false,
    form_field: "organ_space_culture_positive",
    criteria_key: "wound_culture",
    group: "SSI organ/space",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_organ_abscess",
    name_en: "Organ/space abscess",
    name_vi: "Áp xe organ/space (CĐHA / GPB)",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "ORGAN_SPACE",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "organ_space_abscess_imaging_pathology",
    criteria_key: "abscess_imaging",
    group: "SSI organ/space",
    runtime_status: "wired",
  },
  {
    id: "sx.ssi_obgyn_abdominal_pain",
    name_en: "Post-op abdominal pain (CSEC/HYST/VHYS Organ/Space)",
    name_vi: "Đau bụng / tăng nhạy cảm đau bụng sau mổ (CSEC/HYST/VHYS)",
    syndromes: ["SSI"],
    checklist_gates: ["SSI"],
    age_gate: "any",
    ssi_depth: "ORGAN_SPACE",
    window: "SSI_SURVEILLANCE",
    doe_eligible: true,
    form_field: "organ_space_obgyn_abdominal_pain",
    criteria_key: "obgyn_abdominal_pain",
    group: "SSI organ/space OB/GYN",
    runtime_status: "wired",
  },

  // ─── Chapter 17 (catalog_only — W5 forms) ──────────────────────────────────
  {
    id: "sx.ch17_bone_local",
    name_en: "BONE local signs (≥2)",
    name_vi: "BONE: ≥2 triệu chứng tại chỗ (sốt/sưng/đau/nóng/chảy dịch)",
    syndromes: ["CH17_BJ"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 BJ",
    runtime_status: "catalog_only",
    ch17_site: "BONE",
  },
  {
    id: "sx.ch17_disc",
    name_en: "DISC fever or localized pain",
    name_vi: "DISC: sốt hoặc đau khu trú khoang đĩa đệm",
    syndromes: ["CH17_BJ"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 BJ",
    runtime_status: "catalog_only",
    ch17_site: "DISC",
  },
  {
    id: "sx.ch17_jnt",
    name_en: "JNT ≥2 joint signs",
    name_vi: "JNT: ≥2 (sưng/đau/nóng/tràn dịch/hạn chế vận động)",
    syndromes: ["CH17_BJ"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 BJ",
    runtime_status: "catalog_only",
    ch17_site: "JNT",
  },
  {
    id: "sx.ch17_pji",
    name_en: "PJI sinus tract or lab criteria",
    name_vi: "PJI: đường rò hoặc CRP/ESR + WBC dịch khớp",
    syndromes: ["CH17_BJ"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 BJ",
    runtime_status: "catalog_only",
    ch17_site: "PJI",
  },
  {
    id: "sx.ch17_ic",
    name_en: "IC intracranial ≥2 signs",
    name_vi: "IC: ≥2 (đau đầu/chóng mặt/sốt/dấu thần kinh/ý thức)",
    syndromes: ["CH17_CNS"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 CNS",
    runtime_status: "catalog_only",
    ch17_site: "IC",
  },
  {
    id: "sx.ch17_men",
    name_en: "MEN meningitis signs",
    name_vi: "MEN: sốt/đau đầu + dấu màng não / dây thần kinh sọ",
    syndromes: ["CH17_CNS"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 CNS",
    runtime_status: "catalog_only",
    ch17_site: "MEN",
  },
  {
    id: "sx.ch17_sa",
    name_en: "SA spinal abscess local sign",
    name_vi: "SA: ≥1 (sốt/đau lưng/radiculitis/paraparesis)",
    syndromes: ["CH17_CNS"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 CNS",
    runtime_status: "catalog_only",
    ch17_site: "SA",
  },
  {
    id: "sx.ch17_card",
    name_en: "CARD myocarditis/pericarditis",
    name_vi: "CARD: ≥2 (sốt/đau ngực/mạch nghịch/bóng tim to)",
    syndromes: ["CH17_CVS"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 CVS",
    runtime_status: "catalog_only",
    ch17_site: "CARD",
  },
  {
    id: "sx.ch17_med",
    name_en: "MED mediastinitis",
    name_vi: "MED: sốt / đau ngực / mất vững xương ức",
    syndromes: ["CH17_CVS"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 CVS",
    runtime_status: "catalog_only",
    ch17_site: "MED",
  },
  {
    id: "sx.ch17_vasc",
    name_en: "VASC arterial/venous infection",
    name_vi: "VASC: sốt / đau / đỏ / nóng tại mạch",
    syndromes: ["CH17_CVS"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 CVS",
    runtime_status: "catalog_only",
    ch17_site: "VASC",
  },
  {
    id: "sx.ch17_endo",
    name_en: "ENDO endocarditis criteria",
    name_vi: "ENDO: tiếng thổi mới hoặc biến cố mạch/miễn dịch",
    syndromes: ["CH17_CVS"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 CVS",
    runtime_status: "catalog_only",
    ch17_site: "ENDO",
  },
  {
    id: "sx.ch17_conj",
    name_en: "CONJ conjunctivitis",
    name_vi: "CONJ: đau / đỏ / sưng kết mạc hoặc quanh mắt",
    syndromes: ["CH17_EENT"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 EENT",
    runtime_status: "catalog_only",
    ch17_site: "CONJ",
  },
  {
    id: "sx.ch17_ear",
    name_en: "EAR otitis/mastoiditis",
    name_vi: "EAR: đau tai / chảy mủ / viêm xương chũm",
    syndromes: ["CH17_EENT"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 EENT",
    runtime_status: "catalog_only",
    ch17_site: "EAR",
  },
  {
    id: "sx.ch17_eye",
    name_en: "EYE deep eye infection",
    name_vi: "EYE: ≥2 (đau mắt / rối loạn thị giác / hypopyon)",
    syndromes: ["CH17_EENT"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 EENT",
    runtime_status: "catalog_only",
    ch17_site: "EYE",
  },
  {
    id: "sx.ch17_oral",
    name_en: "ORAL cavity",
    name_vi: "ORAL: loét / mảng trắng / mảng bám niêm mạc",
    syndromes: ["CH17_EENT"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 EENT",
    runtime_status: "catalog_only",
    ch17_site: "ORAL",
  },
  {
    id: "sx.ch17_sinu",
    name_en: "SINU sinusitis",
    name_vi: "SINU: sốt / đau xoang / đau đầu / chảy mủ / nghẹt mũi",
    syndromes: ["CH17_EENT"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 EENT",
    runtime_status: "catalog_only",
    ch17_site: "SINU",
  },
  {
    id: "sx.ch17_ur",
    name_en: "UR upper respiratory",
    name_vi: "UR: ≥2 triệu chứng hô hấp trên",
    syndromes: ["CH17_EENT"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 EENT",
    runtime_status: "catalog_only",
    ch17_site: "UR",
  },
  {
    id: "sx.ch17_cdi",
    name_en: "CDI unformed stool",
    name_vi: "CDI: tiêu chảy phân không hình thành khuôn",
    syndromes: ["CH17_GI"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 GI",
    runtime_status: "catalog_only",
    ch17_site: "CDI",
  },
  {
    id: "sx.ch17_ge",
    name_en: "GE gastroenteritis",
    name_vi: "GE: tiêu chảy cấp >12h hoặc ≥2 (nôn/đau bụng/sốt…)",
    syndromes: ["CH17_GI"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 GI",
    runtime_status: "catalog_only",
    ch17_site: "GE",
  },
  {
    id: "sx.ch17_git",
    name_en: "GIT GI tract",
    name_vi: "GIT: ≥2 triệu chứng tương thích vị trí tổn thương",
    syndromes: ["CH17_GI"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 GI",
    runtime_status: "catalog_only",
    ch17_site: "GIT",
  },
  {
    id: "sx.ch17_iab",
    name_en: "IAB intraabdominal",
    name_vi: "IAB: ≥2 (sốt/tụt HA/nôn/đau bụng/vàng da)",
    syndromes: ["CH17_GI"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 GI",
    runtime_status: "catalog_only",
    ch17_site: "IAB",
  },
  {
    id: "sx.ch17_nec",
    name_en: "NEC necrotizing enterocolitis ≤1y",
    name_vi: "NEC: dịch mật hút dạ dày / nôn / chướng bụng / phân máu",
    syndromes: ["CH17_GI"],
    checklist_gates: [],
    age_gate: "le1",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 GI",
    runtime_status: "catalog_only",
    ch17_site: "NEC",
  },
  {
    id: "sx.ch17_emet",
    name_en: "EMET endometritis",
    name_vi: "EMET: ≥2 (sốt/đau tử cung/chảy dịch mủ)",
    syndromes: ["CH17_REPR"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 REPR",
    runtime_status: "catalog_only",
    ch17_site: "EMET",
  },
  {
    id: "sx.ch17_orep",
    name_en: "OREP deep reproductive",
    name_vi: "OREP: ≥2 (sốt/nôn/đau hố chậu/tiểu buốt)",
    syndromes: ["CH17_REPR"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 REPR",
    runtime_status: "catalog_only",
    ch17_site: "OREP",
  },
  {
    id: "sx.ch17_brst",
    name_en: "BRST breast",
    name_vi: "BRST: sốt + viêm đỏ sưng nóng tuyến vú",
    syndromes: ["CH17_SST"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 SST",
    runtime_status: "catalog_only",
    ch17_site: "BRST",
  },
  {
    id: "sx.ch17_circ",
    name_en: "CIRC circumcision ≤30d",
    name_vi: "CIRC: chảy mủ / sưng đỏ đau quy đầu (≤30 ngày)",
    syndromes: ["CH17_SST"],
    checklist_gates: [],
    age_gate: "le1",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 SST",
    runtime_status: "catalog_only",
    ch17_site: "CIRC",
  },
  {
    id: "sx.ch17_decu",
    name_en: "DECU pressure ulcer",
    name_vi: "DECU: ≥2 tại rìa loét (đỏ/sưng/đau)",
    syndromes: ["CH17_SST"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 SST",
    runtime_status: "catalog_only",
    ch17_site: "DECU",
  },
  {
    id: "sx.ch17_skin",
    name_en: "SKIN soft tissue",
    name_vi: "SKIN: mụn mủ/nước/bọc hoặc ≥2 (đau/sưng/đỏ/nóng)",
    syndromes: ["CH17_SST"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 SST",
    runtime_status: "catalog_only",
    ch17_site: "SKIN",
  },
  {
    id: "sx.ch17_umb",
    name_en: "UMB umbilicus ≤30d",
    name_vi: "UMB: đỏ rốn hoặc chảy mủ (≤30 ngày)",
    syndromes: ["CH17_SST"],
    checklist_gates: [],
    age_gate: "le1",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 SST",
    runtime_status: "catalog_only",
    ch17_site: "UMB",
  },
  {
    id: "sx.ch17_usi",
    name_en: "USI deep urinary / renal abscess",
    name_vi: "USI: sốt hoặc đau hông lưng + chảy mủ đường tiểu",
    syndromes: ["CH17_SST"],
    checklist_gates: [],
    age_gate: "any",
    window: "NONE",
    doe_eligible: false,
    form_field: null,
    criteria_key: null,
    group: "Ch.17 SST",
    runtime_status: "catalog_only",
    ch17_site: "USI",
  },
] as const;

const BY_ID = new Map(NKBV_CLINICAL_SYMPTOMS.map((s) => [s.id, s]));

export function symptomById(id: string): NkbvClinicalSymptomDef | undefined {
  return BY_ID.get(id);
}

export function symptomsForSyndrome(syndrome: NkbvSymptomSyndrome): NkbvClinicalSymptomDef[] {
  return NKBV_CLINICAL_SYMPTOMS.filter((s) => s.syndromes.includes(syndrome));
}

export function wiredSymptomsForSyndrome(syndrome: NkbvSymptomSyndrome): NkbvClinicalSymptomDef[] {
  return symptomsForSyndrome(syndrome).filter(
    (s) => s.runtime_status === "wired" && s.form_field,
  );
}

/** Unique form_field keys that count toward DOE for a checklist type. */
export function doeFormFieldsForChecklist(checklistType: string): string[] {
  const t = checklistType.toUpperCase();
  let syndrome: NkbvSymptomSyndrome | null = null;
  if (t === "BSI" || t === "CLABSI") syndrome = "BSI";
  else if (t === "UTI" || t === "CAUTI") syndrome = "UTI";
  else if (t === "VAE") syndrome = "VAE";
  else if (t === "VAP" || t === "HAP" || t === "PNEU") syndrome = "PNEU";
  else if (t === "SSI") syndrome = "SSI";
  if (!syndrome) return [];
  const keys = new Set<string>();
  for (const s of symptomsForSyndrome(syndrome)) {
    if (!s.doe_eligible || !s.form_field) continue;
    if (syndrome === "VAE") continue; // DOE từ vent table
    keys.add(s.form_field);
  }
  return [...keys];
}

export function doeFormFieldsForSsiDepth(
  depth: "SUPERFICIAL" | "DEEP" | "ORGAN_SPACE" | "NONE" | string,
): string[] {
  const d = String(depth || "SUPERFICIAL").toUpperCase();
  const keys = new Set<string>();
  for (const s of symptomsForSyndrome("SSI")) {
    if (!s.doe_eligible || !s.form_field) continue;
    if (s.ssi_depth && s.ssi_depth !== d) continue;
    keys.add(s.form_field);
  }
  return [...keys];
}

export function labelOfFormField(formField: string): string | null {
  const hit = NKBV_CLINICAL_SYMPTOMS.find((s) => s.form_field === formField);
  return hit?.name_vi ?? null;
}

/** form_field → Vietnamese label (print / UI). First wired match wins. */
export function symptomLabelMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of NKBV_CLINICAL_SYMPTOMS) {
    if (!s.form_field) continue;
    if (!out[s.form_field]) out[s.form_field] = s.name_vi;
  }
  return out;
}

export function isVoidingSymptom(def: NkbvClinicalSymptomDef): boolean {
  return def.device_gate === "no_foley";
}

export function isVoidingCriteriaKey(criteriaKey: string): boolean {
  return NKBV_CLINICAL_SYMPTOMS.some(
    (s) => s.criteria_key === criteriaKey && s.device_gate === "no_foley",
  );
}

export function isUtiInfantCriteriaKey(criteriaKey: string): boolean {
  return NKBV_CLINICAL_SYMPTOMS.some(
    (s) =>
      s.criteria_key === criteriaKey &&
      s.syndromes.includes("UTI") &&
      s.age_gate === "le1",
  );
}

export type SymptomTimelineMapEntry = {
  criteriaKey: string;
  milestoneKind: "IMAGING_CHEST" | "SYMPTOM" | "LAB_OTHER" | "PROCEDURE_SURGERY";
  title: string;
};

/**
 * SSOT map form_field → timeline criteria.
 * Một form_field có thể map nhiều criteria_key (alias đờm) — lấy entry đầu theo catalog order
 * cho chiều form→timeline; chiều criteria→form dùng đầy đủ.
 */
export function buildFormFieldToTimelineMap(): Record<string, SymptomTimelineMapEntry> {
  const out: Record<string, SymptomTimelineMapEntry> = {};
  for (const s of NKBV_CLINICAL_SYMPTOMS) {
    if (!s.form_field || !s.criteria_key) continue;
    if (out[s.form_field]) continue;
    const milestoneKind =
      s.criteria_key === "imaging_chest" || s.criteria_key === "abscess_imaging"
        ? "IMAGING_CHEST"
        : "SYMPTOM";
    out[s.form_field] = {
      criteriaKey: s.criteria_key,
      milestoneKind,
      title: s.name_vi,
    };
  }
  return out;
}

/** criteria_key → form_field (đầy đủ alias). */
export function buildCriteriaKeyToFormFieldMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of NKBV_CLINICAL_SYMPTOMS) {
    if (!s.form_field || !s.criteria_key) continue;
    if (!out[s.criteria_key]) out[s.criteria_key] = s.form_field;
  }
  return out;
}

const CRITERIA_TO_FORM = buildCriteriaKeyToFormFieldMap();
const FORM_TO_TIMELINE = buildFormFieldToTimelineMap();

export type CriteriaMapContext = {
  /** BSI | UTI | PNEU | VAE | SSI | HAP | VAP | … */
  syndrome?: string | null;
  ssiDepth?: string | null;
};

function normalizeSyndromeForMap(raw: string | null | undefined): NkbvSymptomSyndrome | null {
  const t = String(raw || "").toUpperCase();
  if (t === "BSI" || t === "CLABSI") return "BSI";
  if (t === "UTI" || t === "CAUTI") return "UTI";
  if (t === "VAE") return "VAE";
  if (t === "VAP" || t === "HAP" || t === "PNEU") return "PNEU";
  if (t === "SSI") return "SSI";
  return null;
}

/**
 * criteria_key → form_field — có ngữ cảnh hội chứng / độ sâu SSI
 * (tránh SSI DEEP/ORGAN bị map nhầm sang superficial_*).
 */
export function criteriaKeyToFormField(
  criteriaKey: string | null | undefined,
  ctx?: CriteriaMapContext,
): string | null {
  if (!criteriaKey) return null;
  const candidates = NKBV_CLINICAL_SYMPTOMS.filter(
    (s) => s.criteria_key === criteriaKey && s.form_field,
  );
  if (candidates.length === 0) return CRITERIA_TO_FORM[criteriaKey] ?? null;

  const syn = normalizeSyndromeForMap(ctx?.syndrome);
  const depth = String(ctx?.ssiDepth || "").toUpperCase() || null;

  let pool = candidates;
  if (syn) {
    const bySyn = candidates.filter((s) => s.syndromes.includes(syn));
    if (bySyn.length) pool = bySyn;
  }
  if (depth && (syn === "SSI" || !syn)) {
    const byDepth = pool.filter((s) => !s.ssi_depth || s.ssi_depth === depth);
    if (byDepth.length) pool = byDepth;
  }
  // VAE: fever_or_wbc → ưu tiên nhiệt độ IVAC
  if (syn === "VAE" && criteriaKey === "fever_or_wbc") {
    const temp = pool.find((s) => s.form_field === "temp_fever_or_hypothermia");
    if (temp?.form_field) return temp.form_field;
  }
  // PNEU: ưu tiên atom sốt (không map về legacy bundle)
  if (syn === "PNEU" && criteriaKey === "fever_or_wbc") {
    const fever = pool.find((s) => s.form_field === "has_pneu_fever");
    if (fever?.form_field) return fever.form_field;
  }
  return pool[0]?.form_field ?? CRITERIA_TO_FORM[criteriaKey] ?? null;
}

export function formFieldToTimelineMeta(
  formField: string,
): SymptomTimelineMapEntry | null {
  return FORM_TO_TIMELINE[formField] ?? null;
}

export function catalogTitleForCriteriaKey(criteriaKey: string): string | null {
  const hit = NKBV_CLINICAL_SYMPTOMS.find((s) => s.criteria_key === criteriaKey);
  return hit?.name_vi ?? null;
}

/** Thủ thuật NHSN được phép dùng đau bụng OB/GYN làm TC Organ/Space */
export const SSI_OBGYN_PROCEDURE_CODES = new Set(["CSEC", "HYST", "VHYS"]);

export function isSsiObgynProcedure(code: string | null | undefined): boolean {
  return SSI_OBGYN_PROCEDURE_CODES.has(String(code || "").trim().toUpperCase());
}

/** Checklist rows for form UI (dedupe by form_field). */
export function formSymptomRowsFor(
  syndrome: NkbvSymptomSyndrome,
  opts?: {
    /** Chỉ hàng có age_gate này (+ luôn gồm `any`) */
    ageGate?: NkbvSymptomAgeGate;
    /** Tập age_gate được phép (mặc định: mọi) */
    includeAgeGates?: NkbvSymptomAgeGate[];
    foleyActive?: boolean;
    ssiDepth?: string;
    /** Ẩn hàng OB/GYN nếu thủ thuật không phải CSEC/HYST/VHYS */
    procedureCode?: string;
    groups?: string[];
  },
): NkbvClinicalSymptomDef[] {
  const seen = new Set<string>();
  const out: NkbvClinicalSymptomDef[] = [];
  const allowAges = opts?.includeAgeGates
    ? new Set<NkbvSymptomAgeGate>([...opts.includeAgeGates, "any"])
    : opts?.ageGate
      ? new Set<NkbvSymptomAgeGate>([opts.ageGate, "any"])
      : null;

  for (const s of wiredSymptomsForSyndrome(syndrome)) {
    if (!s.form_field) continue;
    if (opts?.foleyActive && isVoidingSymptom(s)) continue;
    if (opts?.ssiDepth && s.ssi_depth && s.ssi_depth !== opts.ssiDepth) continue;
    if (
      s.form_field === "organ_space_obgyn_abdominal_pain" &&
      opts?.procedureCode !== undefined &&
      !isSsiObgynProcedure(opts.procedureCode)
    ) {
      continue;
    }
    if (allowAges && !allowAges.has(s.age_gate)) {
      // adult_or_child hiện khi không lọc le1-only
      if (!(s.age_gate === "adult_or_child" && !allowAges.has("le1"))) continue;
    }
    if (opts?.groups && !opts.groups.includes(s.group)) continue;
    if (seen.has(s.form_field)) continue;
    seen.add(s.form_field);
    out.push(s);
  }
  return out;
}

/** Đếm triệu chứng hô hấp PNEU theo dòng catalog (không tính PNU3/infant phụ). */
export function countPneuRespiratoryLines(form: Record<string, unknown>): number {
  const fields = new Set(
    wiredSymptomsForSyndrome("PNEU")
      .filter((s) => s.pneu_resp_line && s.form_field)
      .map((s) => s.form_field as string),
  );
  let n = 0;
  for (const f of fields) {
    if (form[f] === true) n += 1;
  }
  return n;
}

export const UTI_VOIDING_CRITERIA_KEYS_FROM_CATALOG = new Set(
  NKBV_CLINICAL_SYMPTOMS.filter((s) => s.device_gate === "no_foley" && s.criteria_key).map(
    (s) => s.criteria_key as string,
  ),
);

export const UTI_INFANT_CRITERIA_KEYS_FROM_CATALOG = new Set(
  NKBV_CLINICAL_SYMPTOMS.filter(
    (s) => s.syndromes.includes("UTI") && s.age_gate === "le1" && s.criteria_key,
  ).map((s) => s.criteria_key as string),
);

export const PILOT_SYNDROMES: NkbvSymptomSyndrome[] = ["BSI", "UTI", "PNEU", "VAE", "SSI"];

export const CH17_SYNDROMES: NkbvSymptomSyndrome[] = [
  "CH17_BJ",
  "CH17_CNS",
  "CH17_CVS",
  "CH17_EENT",
  "CH17_GI",
  "CH17_REPR",
  "CH17_SST",
];
