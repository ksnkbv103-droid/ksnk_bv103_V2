import { describe, expect, it } from "vitest";
import { 
  evaluateBsiClabsi, 
  evaluateVaeVap, 
  evaluateUtiCauti, 
  evaluateSsi 
} from "./nkbv-rules-engine";
import { 
  BsiVerificationData, 
  VaeVerificationData, 
  UtiVerificationData, 
  SsiVerificationData 
} from "../types/nkbv-verification";

describe("CDC/NHSN 2023 Rules Engine tests", () => {
  
  describe("evaluateBsiClabsi", () => {
    it("identifies respiratory fungi as community infection", () => {
      const data: BsiVerificationData = {
        is_fungi_respiratory: true,
        pathogen_name: "Blastomyces",
        pathogen_type: "RECOGNIZED",
        commensal_culture_count: 0,
        commensal_drawn_separate: false,
        symptoms_window_7days: false,
        cvc_placed_days: 5,
        cvc_active_on_event: true,
        is_neutropenia: false,
        is_intestinal_pathogen: false,
        has_localized_infection: false,
        localized_pathogen_matches: false,
        is_in_sbap_window: false,
        blood_mandatory_for_localized: false
      };
      const res = evaluateBsiClabsi(data);
      expect(res.is_positive).toBe(false);
      expect(res.classification).toBe("COMMUNITY_INFECTION");
    });

    it("diagnoses CLABSI LCBI_1 for recognized pathogen with CVC > 2 days", () => {
      const data: BsiVerificationData = {
        is_fungi_respiratory: false,
        pathogen_name: "Staphylococcus aureus",
        pathogen_type: "RECOGNIZED",
        commensal_culture_count: 0,
        commensal_drawn_separate: false,
        symptoms_window_7days: false,
        cvc_placed_days: 4,
        cvc_active_on_event: true,
        is_neutropenia: false,
        is_intestinal_pathogen: false,
        has_localized_infection: false,
        localized_pathogen_matches: false,
        is_in_sbap_window: false,
        blood_mandatory_for_localized: false
      };
      const res = evaluateBsiClabsi(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("CLABSI");
      expect(res.lcbi_type).toBe("LCBI_1");
    });

    it("excludes commensals without multiple cultures as contamination", () => {
      const data: BsiVerificationData = {
        is_fungi_respiratory: false,
        pathogen_name: "Staphylococcus epidermidis",
        pathogen_type: "COMMON_COMMENSAL",
        commensal_culture_count: 1,
        commensal_drawn_separate: false,
        symptoms_window_7days: true,
        cvc_placed_days: 4,
        cvc_active_on_event: true,
        is_neutropenia: false,
        is_intestinal_pathogen: false,
        has_localized_infection: false,
        localized_pathogen_matches: false,
        is_in_sbap_window: false,
        blood_mandatory_for_localized: false
      };
      const res = evaluateBsiClabsi(data);
      expect(res.is_positive).toBe(false);
      expect(res.classification).toBe("CONTAMINATION");
    });

    it("diagnoses CLABSI LCBI_2 for commensal with multiple cultures, separate draws and symptoms", () => {
      const data: BsiVerificationData = {
        is_fungi_respiratory: false,
        pathogen_name: "Staphylococcus epidermidis",
        pathogen_type: "COMMON_COMMENSAL",
        commensal_culture_count: 2,
        commensal_drawn_separate: true,
        symptoms_window_7days: true,
        cvc_placed_days: 4,
        cvc_active_on_event: true,
        is_neutropenia: false,
        is_intestinal_pathogen: false,
        has_localized_infection: false,
        localized_pathogen_matches: false,
        is_in_sbap_window: false,
        blood_mandatory_for_localized: false
      };
      const res = evaluateBsiClabsi(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("CLABSI");
      expect(res.lcbi_type).toBe("LCBI_2");
    });

    it("identifies Secondary BSI when pathogen matches localized infection in SBAP window", () => {
      const data: BsiVerificationData = {
        is_fungi_respiratory: false,
        pathogen_name: "Klebsiella pneumoniae",
        pathogen_type: "RECOGNIZED",
        commensal_culture_count: 0,
        commensal_drawn_separate: false,
        symptoms_window_7days: false,
        cvc_placed_days: 4,
        cvc_active_on_event: true,
        is_neutropenia: false,
        is_intestinal_pathogen: false,
        has_localized_infection: true,
        localized_pathogen_matches: true,
        is_in_sbap_window: true,
        blood_mandatory_for_localized: false
      };
      const res = evaluateBsiClabsi(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("SECONDARY_BSI");
      expect(res.is_secondary_bsi).toBe(true);
    });

    it("diagnoses Primary BSI Non-CLABSI when CVC placed days < 3", () => {
      const data: BsiVerificationData = {
        is_fungi_respiratory: false,
        pathogen_name: "Pseudomonas aeruginosa",
        pathogen_type: "RECOGNIZED",
        commensal_culture_count: 0,
        commensal_drawn_separate: false,
        symptoms_window_7days: false,
        cvc_placed_days: 1,
        cvc_active_on_event: true,
        is_neutropenia: false,
        is_intestinal_pathogen: false,
        has_localized_infection: false,
        localized_pathogen_matches: false,
        is_in_sbap_window: false,
        blood_mandatory_for_localized: false
      };
      const res = evaluateBsiClabsi(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("PRIMARY_BSI_NON_CLABSI");
    });

    it("applies mucosal barrier injury (MBI_LCBI) exception under chemotherapy", () => {
      const data: BsiVerificationData = {
        is_fungi_respiratory: false,
        pathogen_name: "Candida albicans",
        pathogen_type: "RECOGNIZED",
        commensal_culture_count: 0,
        commensal_drawn_separate: false,
        symptoms_window_7days: false,
        cvc_placed_days: 5,
        cvc_active_on_event: true,
        is_neutropenia: true,
        is_intestinal_pathogen: true,
        has_localized_infection: false,
        localized_pathogen_matches: false,
        is_in_sbap_window: false,
        blood_mandatory_for_localized: false
      };
      const res = evaluateBsiClabsi(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("MBI_LCBI");
    });
  });

  describe("evaluateVaeVap", () => {
    it("handles non-ventilated HAP cases and identifies PNU1 clinical pneumonia", () => {
      const data: VaeVerificationData = {
        patient_age: 45,
        vent_days: 0,
        has_stable_baseline_peep_fio2: false,
        peep_increase_ge_3: false,
        fio2_increase_ge_20: false,
        temp_fever_or_hypothermia: false,
        wbc_abnormal: false,
        new_antimicrobial_ge_4days: false,
        has_purulent_sputum_and_positive_culture: false,
        has_quantitative_culture_positive: false,
        has_respiratory_viral_or_pathogen_test_positive: false,
        
        has_chest_imaging_abnormal: true,
        has_cardiopulmonary_disease_underlying: false,
        imaging_films_count: 1,
        fever_or_wbc_abnormal: true,
        altered_mental_status_ge_70yo: false,
        respiratory_symptoms_count: 2,
        microbiology_evidence: "NONE"
      };
      const res = evaluateVaeVap(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("PNU1");
    });

    it("identifies PVAP in ventilated adults meeting VAC + IVAC + culture criteria", () => {
      const data: VaeVerificationData = {
        patient_age: 30,
        vent_days: 5,
        has_stable_baseline_peep_fio2: true,
        peep_increase_ge_3: true,
        fio2_increase_ge_20: false,
        temp_fever_or_hypothermia: true,
        wbc_abnormal: false,
        new_antimicrobial_ge_4days: true,
        has_purulent_sputum_and_positive_culture: true,
        has_quantitative_culture_positive: false,
        has_respiratory_viral_or_pathogen_test_positive: false,
        
        has_chest_imaging_abnormal: false,
        has_cardiopulmonary_disease_underlying: false,
        imaging_films_count: 0,
        fever_or_wbc_abnormal: false,
        altered_mental_status_ge_70yo: false,
        respiratory_symptoms_count: 0,
        microbiology_evidence: "NONE"
      };
      const res = evaluateVaeVap(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("PVAP");
    });

    it("returns IVAC when ventilator-associated infection exists but without positive culture evidence", () => {
      const data: VaeVerificationData = {
        patient_age: 30,
        vent_days: 5,
        has_stable_baseline_peep_fio2: true,
        peep_increase_ge_3: false,
        fio2_increase_ge_20: true,
        temp_fever_or_hypothermia: false,
        wbc_abnormal: true,
        new_antimicrobial_ge_4days: true,
        has_purulent_sputum_and_positive_culture: false,
        has_quantitative_culture_positive: false,
        has_respiratory_viral_or_pathogen_test_positive: false,
        
        has_chest_imaging_abnormal: false,
        has_cardiopulmonary_disease_underlying: false,
        imaging_films_count: 0,
        fever_or_wbc_abnormal: false,
        altered_mental_status_ge_70yo: false,
        respiratory_symptoms_count: 0,
        microbiology_evidence: "NONE"
      };
      const res = evaluateVaeVap(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("IVAC");
    });
  });

  describe("evaluateUtiCauti", () => {
    it("excludes urine culture with Candida as per CDC guidelines", () => {
      const data: UtiVerificationData = {
        urine_cfu_count: 100000,
        pathogen_count: 1,
        has_fungi_yeast_parasite: true,
        foley_placed_days: 4,
        foley_active_on_event: true,
        has_fever: true,
        has_suprapubic_tenderness: false,
        has_costovertebral_pain: false,
        has_dysuria: false,
        has_blood_culture_positive_in_window: false,
        blood_urine_pathogen_matches: false
      };
      const res = evaluateUtiCauti(data);
      expect(res.is_positive).toBe(false);
      expect(res.classification).toBe("CANDIDA_EXCLUSION");
    });

    it("identifies CAUTI SUTI under catheter usage and clinical fever", () => {
      const data: UtiVerificationData = {
        urine_cfu_count: 120000,
        pathogen_count: 1,
        has_fungi_yeast_parasite: false,
        foley_placed_days: 5,
        foley_active_on_event: true,
        has_fever: true,
        has_suprapubic_tenderness: false,
        has_costovertebral_pain: false,
        has_dysuria: false,
        has_blood_culture_positive_in_window: false,
        blood_urine_pathogen_matches: false
      };
      const res = evaluateUtiCauti(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("CAUTI_SUTI");
    });

    it("diagnoses ABUTI when asymptomatic but blood culture matches urine pathogen", () => {
      const data: UtiVerificationData = {
        urine_cfu_count: 150000,
        pathogen_count: 1,
        has_fungi_yeast_parasite: false,
        foley_placed_days: 5,
        foley_active_on_event: true,
        has_fever: false,
        has_suprapubic_tenderness: false,
        has_costovertebral_pain: false,
        has_dysuria: false,
        has_blood_culture_positive_in_window: true,
        blood_urine_pathogen_matches: true
      };
      const res = evaluateUtiCauti(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("CAUTI_ABUTI");
      expect(res.is_secondary_bsi).toBe(true);
    });

    it("ignores dysuria as a SUTI symptom if Foley is active on event", () => {
      const data: UtiVerificationData = {
        urine_cfu_count: 150000,
        pathogen_count: 1,
        has_fungi_yeast_parasite: false,
        foley_placed_days: 4,
        foley_active_on_event: true,
        has_fever: false,
        has_suprapubic_tenderness: false,
        has_costovertebral_pain: false,
        has_dysuria: true, // true but should be ignored due to active foley
        has_blood_culture_positive_in_window: false,
        blood_urine_pathogen_matches: false
      };
      const res = evaluateUtiCauti(data);
      expect(res.is_positive).toBe(false);
      expect(res.classification).toBe("ASB");
    });

    it("approves SUTI for non-catheterized patient with dysuria", () => {
      const data: UtiVerificationData = {
        urine_cfu_count: 150000,
        pathogen_count: 1,
        has_fungi_yeast_parasite: false,
        foley_placed_days: 0,
        foley_active_on_event: false,
        has_fever: false,
        has_suprapubic_tenderness: false,
        has_costovertebral_pain: false,
        has_dysuria: true,
        has_blood_culture_positive_in_window: false,
        blood_urine_pathogen_matches: false
      };
      const res = evaluateUtiCauti(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("SUTI");
    });
  });

  describe("evaluateSsi", () => {
    it("flags expired surveillance beyond 30 days for standard surgeries", () => {
      const data: SsiVerificationData = {
        days_since_surgery: 35,
        has_implant: false,
        ssi_depth: "SUPERFICIAL",
        superficial_purulent_drainage: true,
        superficial_culture_positive: false,
        superficial_opened_with_inflammation: false,
        superficial_physician_diagnosis: false,
        deep_purulent_drainage: false,
        deep_dehisced_or_opened_with_symptoms: false,
        deep_abscess_imaging_pathology: false,
        organ_space_purulent_drainage: false,
        organ_space_culture_positive: false,
        organ_space_abscess_imaging_pathology: false,
        has_blood_culture_positive: false,
        blood_ssi_pathogen_matches: false,
        loai_phau_thuat_nhsn: "COLO"
      };
      const res = evaluateSsi(data);
      expect(res.is_positive).toBe(false);
      expect(res.classification).toBe("EXPIRED");
    });

    it("accepts implant SSI deep infection within 90 days window", () => {
      const data: SsiVerificationData = {
        days_since_surgery: 60,
        has_implant: true,
        ssi_depth: "DEEP",
        superficial_purulent_drainage: false,
        superficial_culture_positive: false,
        superficial_opened_with_inflammation: false,
        superficial_physician_diagnosis: false,
        deep_purulent_drainage: true,
        deep_dehisced_or_opened_with_symptoms: false,
        deep_abscess_imaging_pathology: false,
        organ_space_purulent_drainage: false,
        organ_space_culture_positive: false,
        organ_space_abscess_imaging_pathology: false,
        has_blood_culture_positive: false,
        blood_ssi_pathogen_matches: false,
        loai_phau_thuat_nhsn: "KPRO"
      };
      const res = evaluateSsi(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("SSI_DEEP");
    });

    it("diagnoses SSI superficial with secondary blood pathogen matching", () => {
      const data: SsiVerificationData = {
        days_since_surgery: 15,
        has_implant: false,
        ssi_depth: "SUPERFICIAL",
        superficial_purulent_drainage: true,
        superficial_culture_positive: false,
        superficial_opened_with_inflammation: false,
        superficial_physician_diagnosis: false,
        deep_purulent_drainage: false,
        deep_dehisced_or_opened_with_symptoms: false,
        deep_abscess_imaging_pathology: false,
        organ_space_purulent_drainage: false,
        organ_space_culture_positive: false,
        organ_space_abscess_imaging_pathology: false,
        has_blood_culture_positive: true,
        blood_ssi_pathogen_matches: true,
        loai_phau_thuat_nhsn: "COLO"
      };
      const res = evaluateSsi(data);
      expect(res.is_positive).toBe(true);
      expect(res.classification).toBe("SSI_SUPERFICIAL");
      expect(res.is_secondary_bsi).toBe(true);
    });
  });
});
