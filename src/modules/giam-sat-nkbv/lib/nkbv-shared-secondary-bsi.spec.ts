import { describe, expect, it } from "vitest";
import {
  evaluateSecondaryBsi,
  organismsMatchForSecondary,
} from "./nkbv-shared-secondary-bsi";

describe("nkbv-shared-secondary-bsi", () => {
  it("matches same species and yeast NOS", () => {
    expect(organismsMatchForSecondary("Escherichia coli", "Escherichia coli")).toBe(true);
    expect(organismsMatchForSecondary("yeast", "Candida albicans")).toBe(true);
  });

  it("bans PedVAE secondary", () => {
    const r = evaluateSecondaryBsi({
      primarySite: "PEDVAE",
      bloodCollectionDate: "2026-08-10",
      sbapStart: "2026-08-01",
      sbapEnd: "2026-08-20",
      bloodOrganism: "E. coli",
      organismsMatch: true,
    });
    expect(r.isSecondary).toBe(false);
  });

  it("bans yeast blood secondary to UTI", () => {
    const r = evaluateSecondaryBsi({
      primarySite: "UTI",
      bloodCollectionDate: "2026-08-10",
      sbapStart: "2026-08-07",
      sbapEnd: "2026-08-23",
      bloodOrganism: "Candida albicans",
      primaryOrganism: "E. coli",
      organismsMatch: false,
    });
    expect(r.isSecondary).toBe(false);
    expect(r.reason).toMatch(/Yeast/i);
  });

  it("bans Candida after PNEU without lung/pleural", () => {
    const r = evaluateSecondaryBsi({
      primarySite: "PNEU",
      bloodCollectionDate: "2026-08-10",
      sbapStart: "2026-08-07",
      sbapEnd: "2026-08-23",
      bloodOrganism: "Candida albicans",
      organismsMatch: true,
    });
    expect(r.isSecondary).toBe(false);
  });

  it("attributes when match in SBAP", () => {
    const r = evaluateSecondaryBsi({
      primarySite: "SSI",
      bloodCollectionDate: "2026-08-10",
      sbapStart: "2026-08-07",
      sbapEnd: "2026-08-23",
      bloodOrganism: "Staphylococcus aureus",
      primaryOrganism: "Staphylococcus aureus",
    });
    expect(r.isSecondary).toBe(true);
  });

  it("Scenario 2 without match", () => {
    const r = evaluateSecondaryBsi({
      primarySite: "IAB",
      bloodCollectionDate: "2026-08-10",
      sbapStart: "2026-08-07",
      sbapEnd: "2026-08-23",
      bloodOrganism: "Klebsiella pneumoniae",
      primaryOrganism: "E. coli",
      bloodMandatoryForPrimary: true,
    });
    expect(r.isSecondary).toBe(true);
    expect(r.reason).toMatch(/Scenario 2/);
  });
});
