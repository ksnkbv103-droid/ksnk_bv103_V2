import { describe, expect, it } from "vitest";
import {
  buildBsiTimelineVerdict,
  countCommensalBloodInIwp,
  resolveBsiDoe,
} from "./nkbv-bsi-timeline-verdict";
import type { BaGridXnCell } from "./nkbv-ba-grid-engine";

function iwpAround(index: string): Set<string> {
  const out = new Set<string>();
  for (let i = -3; i <= 3; i += 1) {
    const d = new Date(`${index}T12:00:00`);
    d.setDate(d.getDate() + i);
    out.add(d.toISOString().slice(0, 10));
  }
  return out;
}

function blood(partial: Partial<BaGridXnCell> & { id: string; ngay: string }): BaGridXnCell {
  return {
    benh_pham: "Máu",
    vi_khuan: "Staphylococcus aureus",
    source: "LIS",
    ...partial,
  };
}

describe("nkbv-bsi-timeline-verdict", () => {
  it("Recognized pathogen + CVC ≥3d → CLABSI", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix }),
      bloodXn: [blood({ id: "b1", ngay: ix })],
      lamSang: { "2026-07-19": [{ key: "fever", label: "Sốt" }] },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
      devicePlacedDate: "2026-07-17",
    });
    expect(v.result.classification).toBe("CLABSI");
    expect(v.criteriaMet).toBe(true);
    expect(v.gate.cvcAssociated).toBe(true);
  });

  it("CVC chỉ 1 ngày tại DOE → PRIMARY_BSI_NON_CLABSI (không gắn)", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix }),
      bloodXn: [blood({ id: "b1", ngay: ix })],
      lamSang: { "2026-07-19": [{ key: "fever", label: "Sốt" }] },
      canThiepDates: ["2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
      devicePlacedDate: "2026-07-01", // sổ cũ — bị bỏ qua khi lưới có ngày
    });
    expect(v.gate.cvcAssociated).toBe(false);
    expect(v.result.classification).toBe("PRIMARY_BSI_NON_CLABSI");
  });

  it("CVC 2 ngày liên tiếp (Day1–2) → chưa đủ Day 3 → không CLABSI", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix }),
      bloodXn: [blood({ id: "b1", ngay: ix })],
      lamSang: { "2026-07-20": [{ key: "fever", label: "Sốt" }] },
      canThiepDates: ["2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
    });
    expect(v.gate.cvcPlacedDays).toBe(2);
    expect(v.gate.cvcAssociated).toBe(false);
    expect(v.result.classification).toBe("PRIMARY_BSI_NON_CLABSI");
  });

  it("CVC tick trước vào viện bị loại — không phình CLABSI", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix }),
      bloodXn: [blood({ id: "b1", ngay: ix })],
      lamSang: { "2026-07-19": [{ key: "fever", label: "Sốt" }] },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
      admissionDate: "2026-07-19",
    });
    expect(v.gate.cvcPlacedDays).toBe(2);
    expect(v.gate.cvcAssociated).toBe(false);
    expect(v.result.classification).toBe("PRIMARY_BSI_NON_CLABSI");
  });

  it("Site Secondary defer: localized + match → SECONDARY_BSI (không CLABSI)", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix, vi_khuan: "E. coli" }),
      bloodXn: [blood({ id: "b1", ngay: ix, vi_khuan: "E. coli" })],
      lamSang: {},
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
      devicePlacedDate: "2026-07-17",
      localizedSite: {
        majorType: "UTI",
        criteriaMet: true,
        siteOrganism: "E. coli",
        sbapStart: "2026-07-17",
        sbapEnd: "2026-08-02",
      },
    });
    expect(v.result.classification).toBe("SECONDARY_BSI");
    expect(v.result.is_secondary_bsi).toBe(true);
  });

  it("Yeast sau UTI exclusion → vẫn Primary candidate messaging (không Secondary)", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix, vi_khuan: "Candida albicans" }),
      bloodXn: [blood({ id: "b1", ngay: ix, vi_khuan: "Candida albicans" })],
      lamSang: {},
      canThiepDates: [],
      iwpDates: iwpAround(ix),
      nsk: ix,
      // criteriaMet false / không pass localized match path như secondary gate exclusion
      localizedSite: {
        majorType: "UTI",
        criteriaMet: false,
        siteOrganism: "E. coli",
      },
    });
    expect(v.result.classification).toBe("PRIMARY_BSI_NON_CLABSI");
    expect(v.result.is_secondary_bsi).not.toBe(true);
  });

  it("Single CoNS without sx → CONTAMINATION", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({
        id: "b1",
        ngay: ix,
        vi_khuan: "Staphylococcus epidermidis",
      }),
      bloodXn: [
        blood({ id: "b1", ngay: ix, vi_khuan: "Staphylococcus epidermidis" }),
      ],
      lamSang: {},
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
      devicePlacedDate: "2026-07-17",
    });
    expect(v.result.classification).toBe("CONTAMINATION");
    expect(v.criteriaMet).toBe(false);
    expect(v.gate.warnings.some((w) => /commensal|CoNS|thiếu triệu chứng/i.test(w))).toBe(
      true,
    );
  });

  it("resolveBsiDoe: LCBI1 = blood; LCBI2 sớm hơn nếu có sốt", () => {
    const iwp = iwpAround("2026-07-20");
    expect(
      resolveBsiDoe({
        bloodDate: "2026-07-20",
        lamSang: { "2026-07-18": [{ key: "fever", label: "Sốt" }] },
        iwpDates: iwp,
        pathogenType: "RECOGNIZED",
      }),
    ).toBe("2026-07-20");
    expect(
      resolveBsiDoe({
        bloodDate: "2026-07-20",
        lamSang: { "2026-07-18": [{ key: "fever", label: "Sốt" }] },
        iwpDates: iwp,
        pathogenType: "COMMON_COMMENSAL",
      }),
    ).toBe("2026-07-18");
  });

  it("CoNS cùng ngày 2 ống → không coi là lấy riêng ngày", () => {
    const ix = "2026-07-20";
    const iwp = iwpAround(ix);
    const a = blood({
      id: "c1",
      ngay: ix,
      vi_khuan: "Staphylococcus epidermidis",
    });
    const b = blood({
      id: "c2",
      ngay: ix,
      vi_khuan: "Staphylococcus epidermidis",
    });
    const counted = countCommensalBloodInIwp(a, [a, b], iwp);
    expect(counted.count).toBe(2);
    expect(counted.drawnSeparate).toBe(false);

    const v = buildBsiTimelineVerdict({
      indexXn: a,
      bloodXn: [a, b],
      lamSang: { [ix]: [{ key: "fever", label: "Sốt" }] },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", ix],
      iwpDates: iwp,
      nsk: ix,
      devicePlacedDate: "2026-07-17",
    });
    expect(v.result.classification).toBe("CONTAMINATION");
  });

  it("MBI: ANC ≥2 ngày + tác nhân đường ruột → MBI_LCBI (không CLABSI)", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix, vi_khuan: "Enterococcus faecalis" }),
      bloodXn: [blood({ id: "b1", ngay: ix, vi_khuan: "Enterococcus faecalis" })],
      lamSang: {},
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
      devicePlacedDate: "2026-07-17",
      ancWbcLt500Ge2d: true,
    });
    expect(v.result.classification).toBe("MBI_LCBI");
  });

  it("tick neutropenia đơn trên Hub không đủ MBI", () => {
    const ix = "2026-07-20";
    const v = buildBsiTimelineVerdict({
      indexXn: blood({ id: "b1", ngay: ix, vi_khuan: "Enterococcus faecalis" }),
      bloodXn: [blood({ id: "b1", ngay: ix, vi_khuan: "Enterococcus faecalis" })],
      lamSang: {},
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: ix,
      devicePlacedDate: "2026-07-17",
      isNeutropenia: true,
    });
    expect(v.result.classification).toBe("CLABSI");
  });
});
