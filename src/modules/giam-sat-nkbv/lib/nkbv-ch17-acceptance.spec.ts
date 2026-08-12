/**
 * 3 kịch bản nghiệm thu tay (logic) — Phase D DoD.
 */
import { describe, expect, it } from "vitest";
import { evaluateCh17Type } from "./nkbv-ch17-definitions";
import { evaluateCh17, evaluateSsi } from "./nkbv-rules-engine";

describe("Ch.17 acceptance scenarios", () => {
  it("1) SSI-BONE sau FUSN — BONE 3a (sốt+đau+MRI+máu)", () => {
    const flags = {
      sx_fever_gt38: true,
      sx_bone_pain: true,
      sx_bone_swelling: true,
      sx_bone_warmth: true,
      img_bone_definitive: true,
      micro_blood_positive: true,
    };
    expect(
      evaluateCh17Type({ typeCode: "BONE", evidence: flags }).metCriterion,
    ).toBe("BONE3");

    const ssi = evaluateSsi({
      days_since_surgery: 53,
      surgery_date: "2026-06-10",
      doe_date: "2026-08-01",
      has_implant: true,
      ssi_depth: "ORGAN_SPACE",
      ssi_event_type: "ORGAN_SPACE",
      organ_space_site: "BONE",
      chapter17_flags: flags,
      superficial_purulent_drainage: false,
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
      blood_organism: "Staphylococcus aureus",
      wound_organism: "Staphylococcus aureus",
      loai_phau_thuat_nhsn: "FUSN",
      calculated_doe: "2026-08-01",
      blood_collection_date: "2026-08-01",
    });
    expect(ssi.is_positive).toBe(true);
    expect(ssi.classification).toBe("ORGAN_SPACE:BONE");
  });

  it("2) PJI sau KPRO chỉ 2/5 phụ → không chốt", () => {
    const r = evaluateCh17Type({
      typeCode: "PJI",
      procedureCode: "KPRO",
      evidence: {
        lab_crp_gt100_and_esr_gt30: true,
        lab_synovial_pmn_gt90: true,
      },
    });
    expect(r.met).toBe(false);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it("3) MEN độc lập — CSF (+) không đòi phẫu thuật", () => {
    const r = evaluateCh17({
      ch17_type_code: "MEN",
      chapter17_flags: { micro_csf_positive: true },
    });
    expect(r.is_positive).toBe(true);
    expect(r.classification).toBe("CH17:MEN");
  });

  it("4) EMET sau CSEC — ≥2 triệu chứng (đóng gap REPR)", () => {
    const res = evaluateSsi({
      days_since_surgery: 5,
      has_implant: false,
      ssi_depth: "ORGAN_SPACE",
      ssi_event_type: "ORGAN_SPACE",
      organ_space_site: "EMET",
      loai_phau_thuat_nhsn: "CSEC",
      chapter17_flags: {
        sx_fever_gt38: true,
        sx_emet_uterine_pain: true,
      },
      superficial_purulent_drainage: false,
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
    });
    expect(res.is_positive).toBe(true);
    expect(res.classification).toBe("ORGAN_SPACE:EMET");
    expect(res.reason).toMatch(/EMET3/);
  });

  it("5) VCUF sau HYST — chảy mủ mỏm cắt", () => {
    expect(
      evaluateCh17Type({
        typeCode: "VCUF",
        procedureCode: "HYST",
        evidence: { sx_vcuf_purulent: true },
      }).metCriterion,
    ).toBe("VCUF2");
  });
});
