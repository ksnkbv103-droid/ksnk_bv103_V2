import { describe, expect, it } from "vitest";
import {
  extractSsiReportingSlice,
  ssiReportingContractGaps,
} from "./nkbv-ssi-reporting-contract";

describe("nkbv-ssi-reporting-contract", () => {
  it("trích mã PT / event / site + nhãn Việt", () => {
    const slice = extractSsiReportingSlice({
      loai_phau_thuat_nhsn: "kpro",
      ssi_event_type: "ORGAN_SPACE",
      organ_space_site: "PJI",
      ssi_depth: "ORGAN_SPACE",
      is_patos: false,
      has_implant: true,
      surgery_date: "2026-07-01",
      doe_date: "2026-08-10",
      days_since_surgery: 40,
    });
    expect(slice.loai_phau_thuat_nhsn).toBe("KPRO");
    expect(slice.loai_phau_thuat_nhsn_vi).toMatch(/khớp gối/i);
    expect(slice.ssi_event_type).toBe("ORGAN_SPACE");
    expect(slice.organ_space_site).toBe("PJI");
    expect(slice.classification_nhsn).toBe("ORGAN_SPACE:PJI");
  });

  it("gaps khi thiếu event hoặc site Organ", () => {
    expect(
      ssiReportingContractGaps({
        loai_phau_thuat_nhsn: "COLO",
        ssi_depth: "SUPERFICIAL",
      }),
    ).toContain("ssi_event_type");
    expect(
      ssiReportingContractGaps({
        loai_phau_thuat_nhsn: "COLO",
        ssi_event_type: "ORGAN_SPACE",
      }),
    ).toContain("organ_space_site");
    expect(
      ssiReportingContractGaps({
        loai_phau_thuat_nhsn: "COLO",
        ssi_event_type: "SIP",
      }),
    ).toEqual([]);
  });
});
