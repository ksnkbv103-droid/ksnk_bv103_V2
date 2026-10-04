import { describe, expect, it } from "vitest";
import {
  applyCh2RitGate,
  checkRitHardStop,
  resolveRitEndForPrior,
  ritPriorFromCaseLike,
  ritTypesOverlap,
} from "./nkbv-rit-hard-stop";
import { clinicalRitEnd } from "./nkbv-shared-timeline";
import {
  evaluateBsiClabsi,
  evaluateSsi,
  evaluateUtiCauti,
  evaluateVaeVap,
} from "./nkbv-rules-engine";
import type { UtiVerificationData } from "../types/nkbv-verification";

function utiPositive(overrides: Partial<UtiVerificationData> = {}): UtiVerificationData {
  return {
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
    blood_urine_pathogen_matches: false,
    calculated_doe: "2026-07-20",
    hai_status: "HAI",
    ...overrides,
  };
}

describe("nkbv-rit-hard-stop (DoD 20a=A)", () => {
  it("cùng UTI DOE+5d → block", () => {
    const priorDoe = "2026-07-15";
    const newDoe = "2026-07-20"; // +5d
    const hit = checkRitHardStop({
      currentMajorType: "UTI",
      doe: newDoe,
      priorEvents: [{ doe: priorDoe, majorType: "UTI" }],
    });
    expect(hit.blocked).toBe(true);
    if (hit.blocked) {
      expect(hit.priorDoe).toBe(priorDoe);
      expect(hit.ritEnd).toBe(clinicalRitEnd(priorDoe));
      expect(hit.reason).toMatch(/thêm tác nhân vào ca cũ/);
      expect(hit.reason).toMatch(/hết RIT/);
    }
  });

  it("UTI vs BSI → không block", () => {
    const hit = checkRitHardStop({
      currentMajorType: "BSI",
      doe: "2026-07-20",
      priorEvents: [{ doe: "2026-07-15", majorType: "UTI" }],
    });
    expect(hit.blocked).toBe(false);
  });

  it("hết RIT (DOE = prior+14) → cho ca mới", () => {
    const priorDoe = "2026-07-15";
    // RIT end = prior+13; day +14 = outside
    const after = "2026-07-29";
    expect(after > clinicalRitEnd(priorDoe)).toBe(true);
    const hit = checkRitHardStop({
      currentMajorType: "UTI",
      doe: after,
      priorEvents: [{ doe: priorDoe, majorType: "UTI" }],
    });
    expect(hit.blocked).toBe(false);
  });

  it("Ch.17 SKIN ≠ DECU → không block (specific type)", () => {
    expect(
      ritTypesOverlap(
        { majorType: "CH17", specificType: "SKIN" },
        { doe: "2026-07-15", majorType: "CH17", specificType: "DECU" },
      ),
    ).toBe(false);
    const hit = checkRitHardStop({
      currentMajorType: "CH17",
      currentSpecificType: "SKIN",
      doe: "2026-07-20",
      priorEvents: [
        { doe: "2026-07-15", majorType: "CH17", specificType: "DECU" },
      ],
    });
    expect(hit.blocked).toBe(false);
  });

  it("Ch.17 cùng SKIN trong RIT → block", () => {
    const hit = checkRitHardStop({
      currentMajorType: "CH17",
      currentSpecificType: "SKIN",
      doe: "2026-07-20",
      priorEvents: [
        { doe: "2026-07-15", majorType: "CH17", specificType: "SKIN" },
      ],
    });
    expect(hit.blocked).toBe(true);
  });

  it("ENDO: RIT = hết admission (không 14d)", () => {
    const priorDoe = "2026-07-01";
    const discharge = "2026-08-15";
    const end = resolveRitEndForPrior(
      { doe: priorDoe, majorType: "CH17", specificType: "ENDO", dischargeDate: discharge },
    );
    expect(end).toBe(discharge);
    expect(end).not.toBe(clinicalRitEnd(priorDoe));
    const hit = checkRitHardStop({
      currentMajorType: "CH17",
      currentSpecificType: "ENDO",
      doe: "2026-08-10", // > 14d from prior but still admitted
      priorEvents: [
        {
          doe: priorDoe,
          majorType: "CH17",
          specificType: "ENDO",
          dischargeDate: discharge,
        },
      ],
    });
    expect(hit.blocked).toBe(true);
  });

  it("SSI / VAE bypass checkRitHardStop", () => {
    expect(
      checkRitHardStop({
        currentMajorType: "SSI",
        doe: "2026-07-20",
        priorEvents: [{ doe: "2026-07-15", majorType: "SSI" }],
      }).blocked,
    ).toBe(false);
    expect(
      checkRitHardStop({
        currentMajorType: "VAE",
        doe: "2026-07-20",
        priorEvents: [{ doe: "2026-07-15", majorType: "VAE" }],
      }).blocked,
    ).toBe(false);
  });

  it("evaluateUtiCauti: UTI DOE+5d + prior → classification RIT, is_positive false", () => {
    const res = evaluateUtiCauti(
      utiPositive({
        calculated_doe: "2026-07-20",
        rit_prior_events: [{ doe: "2026-07-15", majorType: "UTI" }],
      }),
    );
    expect(res.is_positive).toBe(false);
    expect(res.classification).toBe("RIT");
    expect(res.reason).toMatch(/thêm tác nhân/);
  });

  it("evaluateUtiCauti: prior BSI không chặn UTI", () => {
    const res = evaluateUtiCauti(
      utiPositive({
        calculated_doe: "2026-07-20",
        rit_prior_events: [{ doe: "2026-07-15", majorType: "BSI" }],
      }),
    );
    expect(res.is_positive).toBe(true);
    expect(res.classification).toBe("CAUTI_SUTI");
  });

  it("evaluateUtiCauti: hết RIT → cho ca mới", () => {
    const res = evaluateUtiCauti(
      utiPositive({
        calculated_doe: "2026-07-29",
        rit_prior_events: [{ doe: "2026-07-15", majorType: "UTI" }],
      }),
    );
    expect(res.is_positive).toBe(true);
    expect(res.classification).toBe("CAUTI_SUTI");
  });

  it("evaluateBsiClabsi RIT same major blocks; evaluateSsi / VAE bypass", () => {
    const bsi = evaluateBsiClabsi({
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
      blood_mandatory_for_localized: false,
      calculated_doe: "2026-07-20",
      hai_status: "HAI",
      rit_prior_events: [{ doe: "2026-07-15", majorType: "BSI" }],
    } as any);
    expect(bsi.is_positive).toBe(false);
    expect(bsi.classification).toBe("RIT");

    const ssi = evaluateSsi({
      days_since_surgery: 5,
      has_implant: false,
      surgery_date: "2026-07-10",
      doe_date: "2026-07-15",
      ssi_depth: "SUPERFICIAL",
      ssi_event_type: "SIP",
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
      loai_phau_thuat_nhsn: "COLO",
      calculated_doe: "2026-07-15",
      rit_prior_events: [{ doe: "2026-07-10", majorType: "SSI" }],
    } as any);
    expect(ssi.classification).not.toBe("RIT");

    const vae = evaluateVaeVap(
      {
        patient_age: 60,
        vent_days: 5,
        has_stable_baseline_peep_fio2: true,
        peep_increase_ge_3: true,
        fio2_increase_ge_20: false,
        temp_fever_or_hypothermia: true,
        wbc_abnormal: false,
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
        calculated_doe: "2026-07-20",
        rit_prior_events: [{ doe: "2026-07-15", majorType: "VAE" }],
      } as any,
      "VAE",
    );
    expect(vae.classification).not.toBe("RIT");
  });

  it("applyCh2RitGate no-op when priors missing", () => {
    const raw = {
      is_positive: true,
      classification: "CAUTI_SUTI",
      reason: "ok",
    };
    const out = applyCh2RitGate(
      { calculated_doe: "2026-07-20" },
      "UTI",
      raw,
    );
    expect(out).toEqual(raw);
  });

  it("ritPriorFromCaseLike maps hub row; drops SSI", () => {
    const uti = ritPriorFromCaseLike({
      id: "a",
      ngay_phat_hien: "2026-07-15",
      loai_ma: "UTI",
    });
    expect(uti).toMatchObject({ doe: "2026-07-15", majorType: "UTI" });
    expect(
      ritPriorFromCaseLike({
        ngay_phat_hien: "2026-07-15",
        loai_ma: "SSI",
      }),
    ).toBeNull();
  });
});
