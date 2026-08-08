import { describe, expect, it } from "vitest";
import {
  evaluateSecondaryBsiForBlood,
  organismsMatch,
} from "./nkbv-secondary-bsi-gate";

describe("nkbv-secondary-bsi-gate", () => {
  it("organismsMatch genus / exact", () => {
    expect(organismsMatch("Klebsiella pneumoniae", "Klebsiella pneumoniae")).toBe(true);
    expect(organismsMatch("Klebsiella spp", "Klebsiella pneumoniae")).toBe(true);
    expect(organismsMatch("E. coli", "Pseudomonas aeruginosa")).toBe(false);
  });

  it("Scenario 2: máu cấu thành PNU2 → Secondary", () => {
    const v = evaluateSecondaryBsiForBlood({
      blood: { id: "blood-1", date: "2026-07-20", organism: "K. pneumoniae" },
      sites: [
        {
          id: "pneu-1",
          majorType: "PNEU",
          criteriaMet: true,
          sbapDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20", "2026-07-30"],
          criteriaWindowDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
          bloodCriterionIds: ["blood-1"],
          siteOrganism: "Acinetobacter baumannii",
        },
      ],
    });
    expect(v.outcome).toBe("SECONDARY");
    expect(v.scenario).toBe("S2");
  });

  it("Scenario 1: match loài ∈ SBAP → Secondary", () => {
    const v = evaluateSecondaryBsiForBlood({
      blood: { id: "blood-2", date: "2026-07-22", organism: "Pseudomonas aeruginosa" },
      sites: [
        {
          id: "pneu-1",
          majorType: "PNEU",
          criteriaMet: true,
          sbapDates: ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23"],
          siteOrganism: "Pseudomonas aeruginosa",
          bloodCriterionIds: [],
        },
      ],
    });
    expect(v.outcome).toBe("SECONDARY");
    expect(v.scenario).toBe("S1");
  });

  it("exclusion Candida sau PNEU → EXCLUDED_PRIMARY", () => {
    const v = evaluateSecondaryBsiForBlood({
      blood: { id: "blood-3", date: "2026-07-22", organism: "Candida albicans" },
      sites: [
        {
          id: "pneu-1",
          majorType: "PNEU",
          criteriaMet: true,
          sbapDates: ["2026-07-20", "2026-07-21", "2026-07-22"],
          siteOrganism: "Candida albicans",
          bloodCriterionIds: [],
        },
      ],
    });
    expect(v.outcome).toBe("EXCLUDED_PRIMARY");
  });

  it("exclusion yeast máu sau UTI → EXCLUDED_PRIMARY (không Secondary)", () => {
    const v = evaluateSecondaryBsiForBlood({
      blood: { id: "blood-uti-yeast", date: "2026-07-22", organism: "Candida albicans" },
      sites: [
        {
          id: "uti-1",
          majorType: "UTI",
          criteriaMet: true,
          sbapDates: ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-30"],
          siteOrganism: "E. coli",
          bloodCriterionIds: [],
        },
      ],
    });
    expect(v.outcome).toBe("EXCLUDED_PRIMARY");
  });

  it("ngoài SBAP / không S2 → PRIMARY_CANDIDATE", () => {
    const v = evaluateSecondaryBsiForBlood({
      blood: { id: "blood-4", date: "2026-08-15", organism: "S. aureus" },
      sites: [
        {
          id: "pneu-1",
          majorType: "PNEU",
          criteriaMet: true,
          sbapDates: ["2026-07-20", "2026-07-21"],
          siteOrganism: "S. aureus",
        },
      ],
    });
    expect(v.outcome).toBe("PRIMARY_CANDIDATE");
  });
});
