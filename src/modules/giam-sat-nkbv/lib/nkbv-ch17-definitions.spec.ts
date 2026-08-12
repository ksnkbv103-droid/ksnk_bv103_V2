import { describe, expect, it } from "vitest";
import {
  ch17OperationalTypeCodes,
  evaluateCh17Type,
} from "./nkbv-ch17-definitions";
import { resolveCh17Hierarchy } from "./nkbv-ch17-hierarchy";
import {
  endoExtendedIwp,
  endoRitSbapToDischarge,
} from "./nkbv-shared-timeline";

describe("nkbv-ch17-definitions (16 types)", () => {
  it("registry có đủ Phần II + REPR (EMET/OREP/VCUF)", () => {
    const codes = ch17OperationalTypeCodes().sort();
    expect(codes).toEqual(
      [
        "BONE",
        "CARD",
        "CDI",
        "DISC",
        "EMET",
        "ENDO",
        "GE",
        "GIT",
        "IAB",
        "IC",
        "JNT",
        "LUNG",
        "MED",
        "MEN",
        "OREP",
        "PJI",
        "SA",
        "VASC",
        "VCUF",
      ].sort(),
    );
  });

  it("BONE3a: ≥2 triệu chứng + máu + MRI definitive", () => {
    const r = evaluateCh17Type({
      typeCode: "BONE",
      evidence: {
        sx_fever_gt38: true,
        sx_bone_pain: true,
        sx_bone_swelling: true,
        micro_blood_positive: true,
        img_bone_definitive: true,
      },
    });
    expect(r.met).toBe(true);
    expect(r.metCriterion).toBe("BONE3");
  });

  it("BONE1 vi sinh xương", () => {
    const r = evaluateCh17Type({
      typeCode: "BONE",
      evidence: { micro_bone_tissue: true },
    });
    expect(r.metCriterion).toBe("BONE1");
  });

  it("PJI3 cần ≥3/5 phụ — 2/5 fail", () => {
    const fail = evaluateCh17Type({
      typeCode: "PJI",
      procedureCode: "KPRO",
      evidence: {
        lab_crp_gt100_and_esr_gt30: true,
        lab_synovial_pmn_gt90: true,
      },
    });
    expect(fail.met).toBe(false);

    const ok = evaluateCh17Type({
      typeCode: "PJI",
      procedureCode: "KPRO",
      evidence: {
        lab_crp_gt100_and_esr_gt30: true,
        lab_synovial_wbc_gt10k_or_le_pp: true,
        lab_synovial_pmn_gt90: true,
      },
    });
    expect(ok.met).toBe(true);
    expect(ok.metCriterion).toBe("PJI3");
  });

  it("MEN1 CSF (+)", () => {
    const r = evaluateCh17Type({
      typeCode: "MEN",
      evidence: { micro_csf_positive: true },
    });
    expect(r.metCriterion).toBe("MEN1");
  });

  it("IAB1 dịch ổ bụng", () => {
    const r = evaluateCh17Type({
      typeCode: "IAB",
      evidence: { micro_iab_fluid_or_abscess: true },
    });
    expect(r.metCriterion).toBe("IAB1");
  });

  it("CDI1 toxin", () => {
    expect(
      evaluateCh17Type({
        typeCode: "CDI",
        evidence: { lab_cdi_toxin_unformed: true },
      }).metCriterion,
    ).toBe("CDI1");
  });

  it("ENDO4 imaging + typical blood", () => {
    const r = evaluateCh17Type({
      typeCode: "ENDO",
      evidence: {
        img_endo_typical: true,
        micro_endo_blood_typical_ge2: true,
      },
    });
    expect(r.metCriterion).toBe("ENDO4");
  });

  it("LUNG2 pathology", () => {
    expect(
      evaluateCh17Type({
        typeCode: "LUNG",
        evidence: { path_lung_abscess_or_empyema: true },
      }).metCriterion,
    ).toBe("LUNG2");
  });

  it("DISC / JNT / IC / SA / CARD / MED / VASC / GE / GIT smoke TC1", () => {
    expect(
      evaluateCh17Type({ typeCode: "DISC", evidence: { micro_disc_space: true } })
        .metCriterion,
    ).toBe("DISC1");
    expect(
      evaluateCh17Type({
        typeCode: "JNT",
        evidence: { micro_joint_fluid_or_synovium: true },
      }).metCriterion,
    ).toBe("JNT1");
    expect(
      evaluateCh17Type({ typeCode: "IC", evidence: { micro_brain_or_dura: true } })
        .metCriterion,
    ).toBe("IC1");
    expect(
      evaluateCh17Type({ typeCode: "SA", evidence: { micro_spinal_abscess: true } })
        .metCriterion,
    ).toBe("SA1");
    expect(
      evaluateCh17Type({ typeCode: "CARD", evidence: { micro_pericardium: true } })
        .metCriterion,
    ).toBe("CARD1");
    expect(
      evaluateCh17Type({ typeCode: "MED", evidence: { micro_mediastinum: true } })
        .metCriterion,
    ).toBe("MED1");
    expect(
      evaluateCh17Type({ typeCode: "VASC", evidence: { micro_vessel_wall: true } })
        .metCriterion,
    ).toBe("VASC1");
    expect(
      evaluateCh17Type({
        typeCode: "GE",
        evidence: { sx_acute_diarrhea_gt12h: true },
      }).metCriterion,
    ).toBe("GE1");
    expect(
      evaluateCh17Type({
        typeCode: "GIT",
        evidence: { path_gi_abscess_or_infection: true },
      }).metCriterion,
    ).toBe("GIT1");
  });
});

describe("nkbv-ch17-hierarchy", () => {
  it("BONE thắng JNT và PJI sau KPRO", () => {
    expect(
      resolveCh17Hierarchy({ metCodes: ["BONE", "JNT"] }).reportCode,
    ).toBe("BONE");
    expect(
      resolveCh17Hierarchy({
        metCodes: ["BONE", "PJI"],
        procedureCode: "KPRO",
      }).reportCode,
    ).toBe("BONE");
  });

  it("MED sau mổ tim xương ức", () => {
    expect(
      resolveCh17Hierarchy({
        metCodes: ["BONE", "MED"],
        postCardiacMediastinitisWithSternum: true,
      }).reportCode,
    ).toBe("MED");
  });

  it("MEN/IC/SA và shunt 90 ngày", () => {
    expect(
      resolveCh17Hierarchy({ metCodes: ["MEN", "SA"] }).reportCode,
    ).toBe("SA");
    expect(
      resolveCh17Hierarchy({ metCodes: ["MEN", "IC"] }).reportCode,
    ).toBe("MEN");
    expect(
      resolveCh17Hierarchy({
        metCodes: ["MEN", "IC"],
        menWithIcPostOpAbscess: true,
      }).reportCode,
    ).toBe("IC");
    expect(
      resolveCh17Hierarchy({ metCodes: ["MEN"], daysSinceShunt: 30 }).asSsi,
    ).toBe(true);
    expect(
      resolveCh17Hierarchy({ metCodes: ["MEN"], daysSinceShunt: 120 }).asSsi,
    ).toBe(false);
  });

  it("PNEU đè LUNG trừ SSI-LUNG THOR", () => {
    expect(
      resolveCh17Hierarchy({ metCodes: ["LUNG"], pneuMet: true }).reportCode,
    ).toBe("PNEU");
    expect(
      resolveCh17Hierarchy({
        metCodes: ["LUNG"],
        pneuMet: true,
        ssiLungAfterThor: true,
      }).reportCode,
    ).toBe("LUNG");
  });
});

describe("ENDO timeline windows", () => {
  it("IWP 21 ngày (±10)", () => {
    const w = endoExtendedIwp("2026-08-10");
    expect(w.start).toBe("2026-07-31");
    expect(w.end).toBe("2026-08-20");
  });

  it("RIT/SBAP tới discharge", () => {
    const r = endoRitSbapToDischarge({
      indexDate: "2026-08-10",
      dischargeDate: "2026-09-01",
    });
    expect(r.sbapStart).toBe("2026-07-31");
    expect(r.sbapEnd).toBe("2026-09-01");
    expect(r.ritEnd).toBe("2026-09-01");
  });
});
