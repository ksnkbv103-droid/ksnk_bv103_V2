/**
 * Soft 20d — SSI deepest wins (Domain A).
 * Spec: nông+sâu met → Deep; Organ thiếu Ch.17 → không Organ; user nông hơn → warn.
 */
import { describe, expect, it } from "vitest";
import {
  evaluateSsi,
  ssiDeepCriteriaMet,
  ssiOrganSpaceCriteriaMet,
  ssiSuperficialCriteriaMet,
} from "./nkbv-rules-engine";
import { buildSsiTimelineVerdict, mapSsiCriteriaFlags } from "./nkbv-ssi-timeline-verdict";
import type { SsiVerificationData } from "../types/nkbv-verification";

function base(partial: Partial<SsiVerificationData> = {}): SsiVerificationData {
  return {
    days_since_surgery: 10,
    has_implant: false,
    ssi_depth: "SUPERFICIAL",
    ssi_event_type: "SIP",
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
    loai_phau_thuat_nhsn: "COLO",
    ...partial,
  };
}

describe("SSI deepest wins 20d=A", () => {
  it("nông + sâu met → Deep (DIP) + warn khi form SUPERFICIAL/SIP", () => {
    const res = evaluateSsi(
      base({
        ssi_depth: "SUPERFICIAL",
        ssi_event_type: "SIP",
        superficial_purulent_drainage: true,
        deep_purulent_drainage: true,
      }),
    );
    expect(res.is_positive).toBe(true);
    expect(res.classification).toBe("DIP");
    expect(res.ssi_engine_depth).toBe("DEEP");
    expect(res.warnings?.some((w) => /nông hơn|DEEP|sâu nhất/i.test(w))).toBe(true);
  });

  it("chỉ nông met → SIP (không nâng Deep)", () => {
    const res = evaluateSsi(
      base({
        superficial_purulent_drainage: true,
      }),
    );
    expect(res.classification).toBe("SIP");
    expect(res.ssi_engine_depth).toBe("SUPERFICIAL");
    expect(res.warnings).toBeUndefined();
  });

  it("Organ thiếu Ch.17 (chỉ generic + site có def) → không Organ", () => {
    const data = base({
      ssi_depth: "ORGAN_SPACE",
      ssi_event_type: "ORGAN_SPACE",
      organ_space_site: "IAB",
      organ_space_purulent_drainage: true,
    });
    expect(ssiOrganSpaceCriteriaMet(data).met).toBe(false);
    const res = evaluateSsi(data);
    expect(res.is_positive).toBe(false);
    expect(res.classification).toBe("NO_INFECTION");
    expect(res.ssi_engine_depth).toBeUndefined();
  });

  it("Organ generic + nông/sâu → Deep (không Organ khi thiếu Ch.17)", () => {
    const res = evaluateSsi(
      base({
        ssi_depth: "SUPERFICIAL",
        ssi_event_type: "SIP",
        organ_space_site: "IAB",
        organ_space_purulent_drainage: true,
        superficial_purulent_drainage: true,
        deep_purulent_drainage: true,
      }),
    );
    expect(res.classification).toBe("DIP");
    expect(res.ssi_engine_depth).toBe("DEEP");
  });

  it("Organ + Ch.17 met → ORGAN_SPACE:IAB", () => {
    const res = evaluateSsi(
      base({
        ssi_depth: "DEEP",
        ssi_event_type: "DIP",
        organ_space_site: "IAB",
        chapter17_flags: { micro_iab_fluid_or_abscess: true },
        deep_purulent_drainage: true,
        superficial_purulent_drainage: true,
      }),
    );
    expect(res.is_positive).toBe(true);
    expect(res.classification).toBe("ORGAN_SPACE:IAB");
    expect(res.ssi_engine_depth).toBe("ORGAN_SPACE");
    expect(res.warnings?.some((w) => /ORGAN_SPACE/i.test(w))).toBe(true);
  });

  it("SIS + deep met → DIS (giữ secondary incision)", () => {
    const res = evaluateSsi(
      base({
        ssi_depth: "SUPERFICIAL",
        ssi_event_type: "SIS",
        superficial_purulent_drainage: true,
        deep_purulent_drainage: true,
        loai_phau_thuat_nhsn: "CBGB",
      }),
    );
    expect(res.classification).toBe("DIS");
    expect(res.ssi_engine_depth).toBe("DEEP");
  });

  it("PATOS không đụng — vẫn PATOS trước deepest", () => {
    const res = evaluateSsi(
      base({
        is_patos: true,
        superficial_purulent_drainage: true,
        deep_purulent_drainage: true,
      }),
    );
    expect(res.classification).toBe("PATOS");
  });

  it("mapSsiCriteriaFlags maps shared ticks → mọi tầng (engine deepest)", () => {
    const flags = mapSsiCriteriaFlags({
      depth: "SUPERFICIAL",
      tieuChuanByDate: {
        "2026-07-10": [{ key: "purulent_drainage", label: "Mủ" }],
      },
      draftLamSang: {},
      cdha: [],
      spDates: new Set(["2026-07-10"]),
    });
    expect(flags.superficial_purulent_drainage).toBe(true);
    expect(flags.deep_purulent_drainage).toBe(true);
    expect(flags.organ_space_purulent_drainage).toBe(true);
    expect(ssiSuperficialCriteriaMet(flags as SsiVerificationData)).toBe(true);
    expect(ssiDeepCriteriaMet(flags as SsiVerificationData)).toBe(true);
  });

  it("timeline: mủ ∈ SP + form SUPERFICIAL → engine Deep + warn UI gate", () => {
    const v = buildSsiTimelineVerdict({
      surgeryDate: "2026-07-01",
      tieuChuanByDate: {
        "2026-07-10": [{ key: "purulent_drainage", label: "Chảy mủ" }],
      },
      cdha: [],
      bloodXn: [],
      ssiDepth: "SUPERFICIAL",
      ssiEventType: "SIP",
      procedureCode: "COLO",
    });
    expect(v.result.classification).toBe("DIP");
    expect(v.result.ssi_engine_depth).toBe("DEEP");
    expect(v.gate.warnings.some((w) => /nông hơn|DEEP|sâu nhất/i.test(w))).toBe(true);
    expect(v.criteriaMet).toBe(true);
  });

  it("timeline: Organ site không Ch.17 → không Organ (Deep từ shared ticks)", () => {
    const v = buildSsiTimelineVerdict({
      surgeryDate: "2026-07-01",
      tieuChuanByDate: {
        "2026-07-10": [{ key: "purulent_drainage", label: "Mủ" }],
      },
      cdha: [],
      bloodXn: [],
      ssiDepth: "ORGAN_SPACE",
      ssiEventType: "ORGAN_SPACE",
      organSpaceSite: "IAB",
      procedureCode: "COLO",
    });
    expect(v.result.classification).toBe("DIP");
    expect(v.result.ssi_engine_depth).toBe("DEEP");
  });
});
