import { describe, expect, it } from "vitest";
import {
  buildBaSeedLabs,
  collectAnalyzedViSinhIds,
  mapAnalysisSessionToVerificationSeed,
  mapLamSangToFormFields,
} from "./nkbv-analysis-session-to-verification";

describe("nkbv-analysis-session-to-verification", () => {
  it("mapLamSangToFormFields: fever → has_fever + ngày sớm nhất", () => {
    const r = mapLamSangToFormFields(
      {
        "2026-07-20": [{ key: "fever", label: "Sốt" }],
        "2026-07-19": [{ key: "fever", label: "Sốt" }],
        "2026-07-21": [{ key: "dysuria", label: "Đái buốt" }],
      },
      { syndrome: "UTI" },
    );
    expect(r.flags.has_fever).toBe(true);
    expect(r.flags.has_dysuria).toBe(true);
    expect(r.symptom_dates.has_fever).toBe("2026-07-19");
    expect(r.symptom_dates.has_dysuria).toBe("2026-07-21");
  });

  it("collectAnalyzedViSinhIds strips lis: và dedupe", () => {
    const ids = collectAnalyzedViSinhIds({
      indexMilestoneId: "lis:11111111-1111-1111-1111-111111111111",
      attributedXnIds: [
        "lis:22222222-2222-2222-2222-222222222222",
        "11111111-1111-1111-1111-111111111111",
      ],
      secondaryBloodIds: ["33333333-3333-3333-3333-333333333333"],
      bloodCriterionIds: ["lis:33333333-3333-3333-3333-333333333333"],
    });
    expect(ids).toHaveLength(3);
    expect(ids).toContain("11111111-1111-1111-1111-111111111111");
    expect(ids).toContain("22222222-2222-2222-2222-222222222222");
    expect(ids).toContain("33333333-3333-3333-3333-333333333333");
  });

  it("mapAnalysisSessionToVerificationSeed UTI + Secondary", () => {
    const seed = mapAnalysisSessionToVerificationSeed({
      panel: "UTI",
      indexMilestoneId: "lis:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      indexKind: "XN",
      nsk: "2026-07-19",
      isSecondaryBsi: true,
      ketLuan: "HAI · UTI; Secondary BSI · NSK 19/7 · E. coli · A1",
      attributedXnIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      secondaryBloodIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"],
      draft: {
        lamSang: {
          "2026-07-19": [{ key: "fever", label: "Sốt" }],
        },
        bloodCriterionIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"],
        ketLuan: "",
        notesByDate: {},
        readyToChot: true,
        canThiepDates: ["2026-07-17"],
      },
    });
    expect(seed.verification_data.has_fever).toBe(true);
    expect(seed.verification_data.symptom_dates).toEqual({ has_fever: "2026-07-19" });
    expect(seed.verification_data.is_secondary_bsi).toBe(true);
    expect(seed.verification_data.calculated_doe).toBe("2026-07-19");
    expect(seed.verification_data.has_blood_culture_positive_in_window).toBe(true);
    expect(seed.analyzedViSinhIds).toHaveLength(3);
    expect(seed.clinical_notes_patch.ghi_chu_tuy_bien).toMatch(/Secondary BSI/);
  });

  it("PNEU Index CĐHA bật imaging", () => {
    const seed = mapAnalysisSessionToVerificationSeed({
      panel: "PNEU",
      indexMilestoneId: "cdha:xq-1",
      indexKind: "CDHA",
      nsk: "2026-07-17",
      draft: {
        lamSang: {
          "2026-07-17": [{ key: "rales", label: "Rale" }],
        },
        bloodCriterionIds: [],
        ketLuan: "",
        notesByDate: {},
        readyToChot: true,
        canThiepDates: [],
        hasCardiopulmonaryDisease: true,
      },
    });
    expect(seed.verification_data.has_chest_imaging_abnormal).toBe(true);
    expect(seed.verification_data.has_rales_or_wheeze).toBe(true);
    expect(seed.verification_data.pneu_trigger).toBe("IMAGING");
    expect(seed.verification_data.has_cardiopulmonary_disease_underlying).toBe(true);
  });

  it("seed cửa sổ IWP/SBAP/RIT + rit_labs + sbap_labs + device", () => {
    const seed = mapAnalysisSessionToVerificationSeed({
      panel: "PNEU",
      indexMilestoneId: "lis:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      indexKind: "XN",
      nsk: "2026-07-19",
      isSecondaryBsi: true,
      attributedXnIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      secondaryBloodIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"],
      windows: {
        iwp_start: "2026-07-16",
        iwp_end: "2026-07-22",
        sbap_start: "2026-07-19",
        sbap_end: "2026-08-04",
        rit_end: "2026-08-01",
        doe: "2026-07-19",
      },
      ritLabs: [
        {
          id: "lis:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          ngay: "2026-07-19",
          benh_pham: "Đờm",
          vi_khuan: "K. pneumoniae",
          is_index: true,
        },
        {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          ngay: "2026-07-22",
          benh_pham: "Đờm",
          vi_khuan: "A. baumannii",
        },
      ],
      sbapLabs: [
        {
          id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          ngay: "2026-07-21",
          benh_pham: "Máu",
          vi_khuan: "K. pneumoniae",
        },
      ],
      draft: {
        lamSang: {},
        bloodCriterionIds: [],
        ketLuan: "",
        notesByDate: {},
        readyToChot: true,
        canThiepDates: ["2026-07-15", "2026-07-20"],
      },
    });
    expect(seed.verification_data.calculated_iwp_start).toBe("2026-07-16");
    expect(seed.verification_data.calculated_iwp_end).toBe("2026-07-22");
    expect(seed.verification_data.calculated_sbap_start).toBe("2026-07-19");
    expect(seed.verification_data.calculated_rit_end).toBe("2026-08-01");
    expect(seed.verification_data.device_placed_date).toBe("2026-07-15");
    expect(seed.verification_data.device_removed_date).toBe("2026-07-20");
    expect(seed.verification_data.blood_collection_date).toBe("2026-07-21");
    expect(seed.verification_data.ba_rit_labs).toHaveLength(2);
    expect(seed.verification_data.ba_sbap_labs).toHaveLength(1);
    expect(seed.verification_data.has_blood_culture_in_event_period).toBe(true);
  });

  it("buildBaSeedLabs tách RIT vs SBAP máu", () => {
    const { rit_labs, sbap_labs } = buildBaSeedLabs({
      indexId: "x1",
      attributedXnIds: ["x2"],
      secondaryBloodIds: ["b1"],
      sbapDates: ["2026-07-21"],
      xn: [
        {
          id: "x1",
          ngay: "2026-07-19",
          benh_pham: "Đờm",
          vi_khuan: "K.p",
          source: "LIS",
        },
        {
          id: "x2",
          ngay: "2026-07-22",
          benh_pham: "Đờm",
          vi_khuan: "A.b",
          source: "LIS",
        },
        {
          id: "b1",
          ngay: "2026-07-21",
          benh_pham: "Máu",
          vi_khuan: "K.p",
          source: "LIS",
        },
      ],
    });
    expect(rit_labs.map((l) => l.id)).toEqual(["x1", "x2"]);
    expect(sbap_labs.map((l) => l.id)).toEqual(["b1"]);
    expect(rit_labs[0].is_index).toBe(true);
  });
});
