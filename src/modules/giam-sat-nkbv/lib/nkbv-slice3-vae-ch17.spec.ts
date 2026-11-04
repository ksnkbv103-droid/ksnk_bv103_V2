import { describe, expect, it } from "vitest";
import { computeVacFromDailyVent, type VaeVentDailyRow } from "./nkbv-vae-vent-compute";
import { specimenToSyndromePanel, type SyndromePanelId } from "./nkbv-specimen-syndrome";
import { clinicalIwp, endoExtendedIwp, clinicalRitEnd } from "./nkbv-shared-timeline";
import { ch17TypeDef, evaluateCh17Type } from "./nkbv-ch17-definitions";
import { mapAnalysisSessionToVerificationSeed } from "./nkbv-analysis-session-to-verification";
import type { BaAnalysisSessionDraft } from "./nkbv-ba-analysis-session";

describe("Slice 3: VAE Timeline Compute & Ch.17 Unlocking", () => {
  describe("VAE Timeline Engine (CDC Ch.10)", () => {
    it("computes VAC: 2 days baseline stable -> 2 days worsening PEEP >= 3 -> DOE is worsening day 1", () => {
      const rows: VaeVentDailyRow[] = [
        { date: "2026-03-01", peep_min: 5, fio2_min: 30 },
        { date: "2026-03-02", peep_min: 5, fio2_min: 30 }, // Baseline (stable 2d)
        { date: "2026-03-03", peep_min: 9, fio2_min: 30 }, // Worsening day 1 (PEEP 9 - 5 = 4 >= 3) -> DOE
        { date: "2026-03-04", peep_min: 9, fio2_min: 30 }, // Worsening day 2 (sustained)
      ];

      const res = computeVacFromDailyVent(rows);
      expect(res.has_stable_baseline).toBe(true);
      expect(res.peep_increase_ge_3).toBe(true);
      expect(res.fio2_increase_ge_20).toBe(false);
      expect(res.suggested_doe).toBe("2026-03-03"); // First day of worsening, NOT sputum date!
      expect(res.reason).toContain("Gợi ý VAC: ổn định 2026-03-01–2026-03-02, suy giảm từ 2026-03-03");
    });

    it("computes VAC via FiO2 worsening >= 20%", () => {
      const rows: VaeVentDailyRow[] = [
        { date: "2026-03-05", peep_min: 5, fio2_min: 40 },
        { date: "2026-03-06", peep_min: 5, fio2_min: 40 },
        { date: "2026-03-07", peep_min: 5, fio2_min: 65 }, // FiO2 65 - 40 = 25 >= 20%
        { date: "2026-03-08", peep_min: 5, fio2_min: 65 },
      ];

      const res = computeVacFromDailyVent(rows);
      expect(res.has_stable_baseline).toBe(true);
      expect(res.fio2_increase_ge_20).toBe(true);
      expect(res.suggested_doe).toBe("2026-03-07");
    });

    it("excludes full calendar days on ECMO/HFV from VAC stretch", () => {
      const rows: VaeVentDailyRow[] = [
        { date: "2026-03-01", peep_min: 5, fio2_min: 30 },
        { date: "2026-03-02", peep_min: 5, fio2_min: 30, on_ecmo: true }, // ECMO day excluded
        { date: "2026-03-03", peep_min: 9, fio2_min: 30 },
        { date: "2026-03-04", peep_min: 9, fio2_min: 30 },
      ];

      const res = computeVacFromDailyVent(rows);
      expect(res.excluded_dates).toContain("2026-03-02");
      expect(res.has_stable_baseline).toBe(false);
    });

    it("seeds VAE daily parameters and flags into verification_data", () => {
      const draft: BaAnalysisSessionDraft = {
        lamSang: {},
        bloodCriterionIds: [],
        ketLuan: "PVAP",
        notesByDate: {},
        readyToChot: true,
        canThiepDates: ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"],
        vaeVentDailyParams: [
          { date: "2026-03-01", peep_min: 5, fio2_min: 30 },
          { date: "2026-03-02", peep_min: 5, fio2_min: 30 },
          { date: "2026-03-03", peep_min: 9, fio2_min: 30 },
          { date: "2026-03-04", peep_min: 9, fio2_min: 30 },
        ],
        vaeNewAntimicrobial4d: true,
        vaePurulentSputum: true,
      };

      const mapped = mapAnalysisSessionToVerificationSeed({
        panel: "VAE",
        draft,
        indexMilestoneId: "test-milestone-vae",
        indexKind: "XN",
        nsk: "2026-03-03",
        ketLuan: "PVAP",
      });

      expect(mapped.verification_data.calculated_doe).toBe("2026-03-03");
      expect(mapped.verification_data.has_stable_baseline_peep_fio2).toBe(true);
      expect(mapped.verification_data.new_antimicrobial_ge_4days).toBe(true);
      expect(mapped.verification_data.has_purulent_sputum_and_positive_culture).toBe(true);
      expect(mapped.verification_data.vent_daily_params).toHaveLength(4);
    });
  });

  describe("Chapter 17 (CH17) Domain Integration", () => {
    it("specimenToSyndromePanel routes Ch.17 specimens to CH17 panel", () => {
      expect(specimenToSyndromePanel({ loai_benh_pham_chuan: "URT" })).toBe("CH17");
      expect(specimenToSyndromePanel({ loai_benh_pham: "Bệnh phẩm URT" })).toBe("CH17");
      expect(
        specimenToSyndromePanel({
          loai_benh_pham_chuan: "SURGICAL_SITE_FLUID",
          lis_goc: "Dịch / mô thận (USI, không phải nước tiểu)",
        }),
      ).toBe("CH17");
    });

    it("calculates 7-day IWP for standard Ch.17 and 21-day IWP for ENDO", () => {
      const stdIwp = clinicalIwp("2026-04-10");
      expect(stdIwp.start).toBe("2026-04-07");
      expect(stdIwp.end).toBe("2026-04-13"); // ±3 days (7 days)

      const endoIwp = endoExtendedIwp("2026-04-10");
      expect(endoIwp.start).toBe("2026-03-31");
      expect(endoIwp.end).toBe("2026-04-20"); // ±10 days (21 days)
    });

    it("evaluates Ch.17 criteria tree (SKIN criteria)", () => {
      const skinDef = ch17TypeDef("SKIN");
      expect(skinDef).toBeDefined();

      // Tiêu chí 1: Mủ / mụn mủ / bóng nước / nhọt trên da
      const eval1 = evaluateCh17Type({
        typeCode: "SKIN",
        evidence: { sx_skin_pustule_vesicle_boil: true },
      });
      expect(eval1.met).toBe(true);
      expect(eval1.reason).toContain("thỏa mãn SKIN1");

      // Thiếu bằng chứng -> met = false
      const eval2 = evaluateCh17Type({
        typeCode: "SKIN",
        evidence: {},
      });
      expect(eval2.met).toBe(false);
    });

    it("calculates 14-day RIT from DOE", () => {
      const doe = "2026-04-10";
      const rit = clinicalRitEnd(doe);
      expect(rit).toBe("2026-04-23"); // 14 calendar days
    });

    it("seeds Chapter 17 verification data correctly", () => {
      const draft: BaAnalysisSessionDraft = {
        lamSang: {},
        bloodCriterionIds: [],
        ketLuan: "Nhiễm khuẩn da và mô mềm (SKIN) — NKBV (HAI)",
        notesByDate: {},
        readyToChot: true,
        canThiepDates: [],
        ch17TypeCode: "SKIN",
        ch17Flags: { organism_culture_positive: true },
      };

      const mapped = mapAnalysisSessionToVerificationSeed({
        panel: "CH17",
        draft,
        indexMilestoneId: "test-milestone-ch17",
        indexKind: "XN",
        nsk: "2026-04-10",
        ketLuan: "Nhiễm khuẩn da và mô mềm (SKIN) — NKBV (HAI)",
      });

      expect(mapped.verification_data.calculated_doe).toBe("2026-04-10");
      expect(mapped.verification_data.ch17_type_code).toBe("SKIN");
      expect(mapped.verification_data.chapter17_flags).toEqual({
        organism_culture_positive: true,
      });
    });
  });
});
