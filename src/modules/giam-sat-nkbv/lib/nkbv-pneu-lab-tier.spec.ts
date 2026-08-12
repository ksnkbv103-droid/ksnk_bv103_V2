import { describe, expect, it } from "vitest";
import {
  applyPneuLabDerivedFlags,
  derivePneuLabTier,
  labFactsFromXnCell,
  parsePneuSoLuong,
} from "./nkbv-pneu-lab-tier";

describe("derivePneuLabTier (lab-first PNU)", () => {
  it("sputum + common bacterium → không nâng PNU2 (giữ NONE → PNU1)", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "SPUTUM",
      pneu_lab_organism: "Klebsiella pneumoniae",
      pneu_lab_cfu_per_ml: 1e6,
      microbiology_evidence: "NONE",
    });
    expect(r.tier).toBe("NONE");
    expect(r.has_qualifying_lab).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/đờm|Table 2/i);
  });

  it("BAL ≥10⁴ + Pseudomonas → PNU2", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "BAL",
      pneu_lab_organism: "Pseudomonas aeruginosa",
      pneu_lab_cfu_per_ml: 5e4,
    });
    expect(r.tier).toBe("PNU2");
    expect(r.has_qualifying_lab).toBe(true);
  });

  it("ETA dưới ngưỡng + không semi-quant → không PNU2", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "ETA",
      pneu_lab_organism: "Acinetobacter baumannii",
      pneu_lab_cfu_per_ml: 1e4,
      vent_days: 5,
    });
    expect(r.tier).toBe("NONE");
  });

  it("ETA ≥10⁵ khi thở máy → PNU2", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "ETA",
      pneu_lab_organism: "Acinetobacter baumannii",
      pneu_lab_cfu_per_ml: 1e5,
      vent_days: 5,
    });
    expect(r.tier).toBe("PNU2");
  });

  it("Candida từ BAL → loại khỏi PNU2", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "BAL",
      pneu_lab_organism: "Candida albicans",
      pneu_lab_cfu_per_ml: 1e5,
    });
    expect(r.tier).toBe("NONE");
    expect(r.lab_excluded).toBe(true);
  });

  it("cấy máu (+) → PNU2", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "BLOOD",
      pneu_lab_organism: "Streptococcus pneumoniae",
    });
    expect(r.tier).toBe("PNU2");
  });

  it("Table 3 virus → PNU2", () => {
    const r = derivePneuLabTier({
      pneu_lab_table3_positive: true,
      pneu_lab_organism: "Influenza A",
    });
    expect(r.tier).toBe("PNU2");
  });

  it("IC + lab PNU2 → PNU3", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "BAL",
      pneu_lab_organism: "Pseudomonas aeruginosa",
      pneu_lab_cfu_per_ml: 1e4,
      pneu_is_immunocompromised: true,
    });
    expect(r.tier).toBe("PNU3");
  });

  it("Candida máu+LRT + IC → PNU3", () => {
    const r = derivePneuLabTier({
      pneu_candida_blood_and_lrt_match: true,
      pneu_is_immunocompromised: true,
    });
    expect(r.tier).toBe("PNU3");
  });

  it("legacy dropdown PNU2 khi chưa có fact lab", () => {
    const r = derivePneuLabTier({ microbiology_evidence: "PNU2" });
    expect(r.tier).toBe("PNU2");
    expect(r.used_lab_facts).toBe(false);
  });

  it("semi-quant Moderate trên BAL → PNU2", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "BAL",
      pneu_lab_organism: "Klebsiella pneumoniae",
      pneu_lab_semi_quant: "MODERATE",
    });
    expect(r.tier).toBe("PNU2");
  });

  it("Table 3 atom Influenza → PNU2", () => {
    const r = derivePneuLabTier({ pneu_t3_influenza: true });
    expect(r.tier).toBe("PNU2");
    expect(r.table3_positive).toBe(true);
  });

  it("IC atom hóa chất + BAL đạt → PNU3", () => {
    const r = derivePneuLabTier({
      pneu_lab_specimen: "BAL",
      pneu_lab_organism: "K. pneumoniae",
      pneu_lab_cfu_per_ml: 1e4,
      pneu_ic_chemotherapy: true,
    });
    expect(r.tier).toBe("PNU3");
    expect(r.immunocompromised).toBe(true);
  });

  it("parsePneuSoLuong: 10^5 / 2+ / 1e4", () => {
    expect(parsePneuSoLuong("10^5").cfu_per_ml).toBe(1e5);
    expect(parsePneuSoLuong("2+").semi_quant).toBe("PLUS_2");
    expect(parsePneuSoLuong("1e4").cfu_per_ml).toBe(1e4);
  });

  it("labFactsFromXnCell đổ BAL + CFU", () => {
    const f = labFactsFromXnCell({
      benh_pham: "BAL",
      vi_khuan: "P. aeruginosa",
      so_luong: "10^4",
    });
    expect(f.pneu_lab_specimen).toBe("BAL");
    expect(f.pneu_lab_cfu_per_ml).toBe(1e4);
  });

  it("apply reset Table3 bỏ sticky khi uncheck atom", () => {
    const withAgg = applyPneuLabDerivedFlags(
      { pneu_t3_influenza: true, pneu_lab_table3_positive: false },
      { resetTable3Aggregate: true },
    );
    expect(withAgg.pneu_lab_table3_positive).toBe(true);
    const cleared = applyPneuLabDerivedFlags(
      { ...withAgg, pneu_t3_influenza: false },
      { resetTable3Aggregate: true },
    );
    expect(cleared.pneu_lab_table3_positive).toBe(false);
  });
});
