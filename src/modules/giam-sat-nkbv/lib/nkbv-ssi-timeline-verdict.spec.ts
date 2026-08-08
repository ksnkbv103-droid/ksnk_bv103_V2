import { describe, expect, it } from "vitest";
import {
  buildSsiTimelineVerdict,
  collectSsiDiagnosticDatesInSp,
  resolveSsiDoe,
  ssiSpEndDate,
  ssiSurveillancePeriodDays,
} from "./nkbv-ssi-timeline-verdict";
import { ssiSbapWindow } from "./nkbv-shared-timeline";
import type { BaGridXnCell } from "./nkbv-ba-grid-engine";

describe("nkbv-ssi-timeline-verdict", () => {
  it("SP: superficial luôn 30; deep/organ theo mã PT (fallback implant)", () => {
    expect(ssiSurveillancePeriodDays("SUPERFICIAL", true)).toBe(30);
    expect(ssiSurveillancePeriodDays("DEEP", false)).toBe(30);
    expect(ssiSurveillancePeriodDays("DEEP", true)).toBe(90);
    expect(
      ssiSurveillancePeriodDays("DEEP", { procedureCode: "COLO" }),
    ).toBe(30);
    expect(
      ssiSurveillancePeriodDays("DEEP", { procedureCode: "KPRO" }),
    ).toBe(90);
    expect(ssiSurveillancePeriodDays("ORGAN_SPACE", true)).toBe(90);
    expect(ssiSpEndDate("2026-07-01", "SUPERFICIAL", false)).toBe("2026-07-31");
  });

  it("DOE = sớm nhất phần tử chẩn đoán ∈ SP; không lấy ngày mổ đơn thuần", () => {
    const surgery = "2026-07-01";
    const spEnd = ssiSpEndDate(surgery, "SUPERFICIAL", false);
    const spDates = new Set<string>();
    let c = surgery;
    while (c <= spEnd) {
      spDates.add(c);
      const d = new Date(`${c}T12:00:00`);
      d.setDate(d.getDate() + 1);
      c = d.toISOString().slice(0, 10);
    }
    const dates = collectSsiDiagnosticDatesInSp({
      tieuChuanByDate: {
        "2026-07-10": [{ key: "purulent_drainage", label: "Mủ" }],
        "2026-07-05": [{ key: "wound_opened", label: "Mở" }],
      },
      cdha: [],
      spDates,
    });
    expect(dates[0]).toBe("2026-07-05");
    expect(resolveSsiDoe({ surgeryDate: surgery, diagnosticDatesInSp: dates })).toBe(
      "2026-07-05",
    );
    expect(resolveSsiDoe({ surgeryDate: surgery, diagnosticDatesInSp: [] })).toBeNull();
  });

  it("Surgery + purulent ∈ 30d → SIP; DOE = ngày mủ; SBAP 17d", () => {
    const surgery = "2026-07-01";
    const pus = "2026-07-10";
    const v = buildSsiTimelineVerdict({
      surgeryDate: surgery,
      tieuChuanByDate: {
        [pus]: [{ key: "purulent_drainage", label: "Chảy mủ" }],
      },
      cdha: [],
      bloodXn: [],
      ssiDepth: "SUPERFICIAL",
      ssiEventType: "SIP",
      procedureCode: "COLO",
    });
    expect(v.result.classification).toBe("SIP");
    expect(v.criteriaMet).toBe(true);
    expect(v.gate.doe).toBe(pus);
    expect(v.gate.spDates.has(pus)).toBe(true);
    expect(v.gate.spDates.has(surgery)).toBe(true);
    // Không IWP — gate không có iwp
    expect(v.data.calculated_sbap_start).toBe(ssiSbapWindow(pus).start);
    expect(v.data.calculated_sbap_end).toBe(ssiSbapWindow(pus).end);
    expect(v.gate.noteImplantProxy).toMatch(/30/);
  });

  it("TC sau SP end → EXPIRED / không criteriaMet", () => {
    const surgery = "2026-07-01";
    const late = "2026-08-05"; // > surgery+30
    const v = buildSsiTimelineVerdict({
      surgeryDate: surgery,
      tieuChuanByDate: {
        [late]: [{ key: "purulent_drainage", label: "Chảy mủ" }],
      },
      cdha: [],
      bloodXn: [],
      ssiDepth: "SUPERFICIAL",
    });
    expect(v.result.classification).toBe("EXPIRED");
    expect(v.criteriaMet).toBe(false);
    expect(v.gate.doe).toBeNull();
  });

  it("PATOS → classification PATOS", () => {
    const v = buildSsiTimelineVerdict({
      surgeryDate: "2026-07-01",
      tieuChuanByDate: {
        "2026-07-05": [{ key: "purulent_drainage", label: "Mủ" }],
      },
      cdha: [],
      bloodXn: [],
      isPatos: true,
    });
    expect(v.result.classification).toBe("PATOS");
    expect(v.criteriaMet).toBe(false);
  });

  it("Máu khớp ∈ SSI SBAP → is_secondary_bsi", () => {
    const surgery = "2026-07-01";
    const pus = "2026-07-10";
    const blood: BaGridXnCell = {
      id: "b1",
      ngay: "2026-07-12",
      benh_pham: "Máu",
      vi_khuan: "S. aureus",
      source: "LIS",
    };
    const v = buildSsiTimelineVerdict({
      surgeryDate: surgery,
      tieuChuanByDate: {
        [pus]: [{ key: "purulent_drainage", label: "Mủ" }],
      },
      cdha: [],
      bloodXn: [blood],
      woundOrganism: "S. aureus",
      ssiDepth: "SUPERFICIAL",
      ssiEventType: "SIP",
      procedureCode: "COLO",
    });
    expect(v.result.classification).toBe("SIP");
    expect(v.result.is_secondary_bsi).toBe(true);
    expect(v.gate.sbapDates.has("2026-07-12")).toBe(true);
  });
});
