import { describe, expect, it } from "vitest";
import {
  CH17_SYNDROMES,
  countPneuRespiratoryCdcGroupsFromKeys,
  countPneuRespiratoryLines,
  NKBV_CLINICAL_SYMPTOMS,
  PILOT_SYNDROMES,
  buildCriteriaKeyToFormFieldMap,
  catalogTitleForCriteriaKey,
  criteriaKeyToFormField,
  displaySymptomLabel,
  doeFormFieldsForChecklist,
  doeFormFieldsForSsiDepth,
  formSymptomRowsFor,
  isVoidingCriteriaKey,
  labelOfFormField,
  NKBV_LABEL_FEVER_GT_38,
  NKBV_LABEL_IVAC_TEMP,
  NKBV_LABEL_PNEU_SYSTEMIC_OR,
  symptomsForSyndrome,
  wiredSymptomsForSyndrome,
} from "./nkbv-clinical-symptom-catalog";

describe("nkbv-clinical-symptom-catalog", () => {
  it("has unique ids", () => {
    const ids = NKBV_CLINICAL_SYMPTOMS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers five pilot syndromes with wired form fields", () => {
    for (const syn of PILOT_SYNDROMES) {
      const wired = wiredSymptomsForSyndrome(syn);
      expect(wired.length, syn).toBeGreaterThan(0);
    }
  });

  it("keeps Chapter 17 as catalog_only (no form_field)", () => {
    for (const syn of CH17_SYNDROMES) {
      const rows = symptomsForSyndrome(syn);
      expect(rows.length, syn).toBeGreaterThan(0);
      expect(rows.every((r) => r.runtime_status === "catalog_only")).toBe(true);
      expect(rows.every((r) => r.form_field === null)).toBe(true);
    }
  });

  it("maps fever / UTI voiding / BSI chills criteria keys", () => {
    expect(criteriaKeyToFormField("fever")).toBe("has_fever");
    expect(criteriaKeyToFormField("chills")).toBe("has_chills");
    expect(criteriaKeyToFormField("hypotension")).toBe("has_hypotension");
    expect(criteriaKeyToFormField("dysuria")).toBe("has_dysuria");
    expect(criteriaKeyToFormField("infant_apnea")).toBe("has_infant_apnea");
    expect(isVoidingCriteriaKey("dysuria")).toBe(true);
    expect(isVoidingCriteriaKey("fever")).toBe(false);
  });

  it("resolves shared criteria keys by syndrome / SSI depth", () => {
    expect(criteriaKeyToFormField("fever_or_wbc", { syndrome: "PNEU" })).toBe("has_pneu_fever");
    expect(criteriaKeyToFormField("fever", { syndrome: "PNEU" })).toBe("has_pneu_fever");
    expect(criteriaKeyToFormField("fever", { syndrome: "UTI" })).toBe("has_fever");
    expect(criteriaKeyToFormField("fever_or_wbc", { syndrome: "VAE" })).toBe(
      "temp_fever_or_hypothermia",
    );
    expect(
      criteriaKeyToFormField("purulent_drainage", { syndrome: "SSI", ssiDepth: "DEEP" }),
    ).toBe("deep_purulent_drainage");
    expect(
      criteriaKeyToFormField("purulent_drainage", {
        syndrome: "SSI",
        ssiDepth: "ORGAN_SPACE",
      }),
    ).toBe("organ_space_purulent_drainage");
    expect(criteriaKeyToFormField("obgyn_abdominal_pain")).toBe(
      "organ_space_obgyn_abdominal_pain",
    );
  });

  it("doe keys exclude VAE vent path and include BSI split symptoms", () => {
    expect(doeFormFieldsForChecklist("VAE")).toEqual([]);
    const bsi = doeFormFieldsForChecklist("BSI");
    expect(bsi).toContain("has_fever");
    expect(bsi).toContain("has_chills");
    expect(bsi).toContain("has_hypotension");
    const uti = doeFormFieldsForChecklist("UTI");
    expect(uti).toContain("has_infant_lethargy");
    expect(doeFormFieldsForSsiDepth("SUPERFICIAL")).toContain("superficial_purulent_drainage");
  });

  it("hides voiding rows when Foley active", () => {
    const open = formSymptomRowsFor("UTI", { foleyActive: false });
    const closed = formSymptomRowsFor("UTI", { foleyActive: true });
    expect(open.some((r) => r.form_field === "has_dysuria")).toBe(true);
    expect(closed.some((r) => r.form_field === "has_dysuria")).toBe(false);
  });

  it("đếm nhóm CDC hô hấp — khó thở + thở nhanh = 1", () => {
    expect(
      countPneuRespiratoryLines({
        has_dyspnea: true,
        has_tachypnea: true,
      }),
    ).toBe(1);
    expect(
      countPneuRespiratoryLines({
        has_new_cough: true,
        has_rales_or_wheeze: true,
      }),
    ).toBe(2);
    expect(countPneuRespiratoryCdcGroupsFromKeys(["dyspnea", "tachypnea"])).toBe(1);
    expect(countPneuRespiratoryCdcGroupsFromKeys(["cough", "rales"])).toBe(2);
  });

  it("labelOfFormField returns Vietnamese", () => {
    expect(labelOfFormField("has_fever")).toBe(NKBV_LABEL_FEVER_GT_38);
    expect(labelOfFormField("has_pneu_fever")).toBe(NKBV_LABEL_FEVER_GT_38);
    expect(labelOfFormField("temp_fever_or_hypothermia")).toBe(NKBV_LABEL_IVAC_TEMP);
  });

  it("nhãn sốt thống nhất — không còn «Sốt» trần / «Sốt / WBC»", () => {
    expect(displaySymptomLabel({ criteriaKey: "fever", storedTitle: "Sốt" })).toBe(
      NKBV_LABEL_FEVER_GT_38,
    );
    expect(displaySymptomLabel({ storedTitle: "Sốt >38" })).toBe(NKBV_LABEL_FEVER_GT_38);
    expect(displaySymptomLabel({ storedTitle: "Sốt (hỗ trợ)" })).toBe(NKBV_LABEL_FEVER_GT_38);
    expect(displaySymptomLabel({ criteriaKey: "fever_or_wbc", syndrome: "VAE" })).toBe(
      NKBV_LABEL_IVAC_TEMP,
    );
    expect(displaySymptomLabel({ criteriaKey: "fever_or_wbc", syndrome: "HAP" })).toBe(
      NKBV_LABEL_PNEU_SYSTEMIC_OR,
    );
    expect(catalogTitleForCriteriaKey("fever")).toBe(NKBV_LABEL_FEVER_GT_38);
    expect(catalogTitleForCriteriaKey("fever_or_wbc", { syndrome: "VAE" })).toBe(
      NKBV_LABEL_IVAC_TEMP,
    );
  });

  it("criteria→form map is non-empty and stable for imaging", () => {
    const map = buildCriteriaKeyToFormFieldMap();
    expect(map.imaging_chest).toBe("has_chest_imaging_abnormal");
    expect(map.fever_or_wbc).toBe("has_pneu_fever");
  });
});
