import { describe, expect, it } from "vitest";
import {
  buildPneuTimelineVerdict,
  shouldShowPneuAmsInCatalog,
} from "./nkbv-pneu-timeline-verdict";
import type { BaGridCdhaCell, BaGridXnCell } from "./nkbv-ba-grid-engine";

function iwpAround(index: string): Set<string> {
  const out = new Set<string>();
  for (let i = -3; i <= 3; i += 1) {
    const d = new Date(`${index}T12:00:00`);
    d.setDate(d.getDate() + i);
    out.add(d.toISOString().slice(0, 10));
  }
  return out;
}

function sputum(partial: Partial<BaGridXnCell> & { id: string; ngay: string }): BaGridXnCell {
  return {
    benh_pham: "Đờm",
    vi_khuan: "K. pneumoniae",
    so_luong: "10^5",
    source: "LIS",
    ...partial,
  };
}

function xq(partial: Partial<BaGridCdhaCell> & { id: string; ngay: string }): BaGridCdhaCell {
  return {
    loai: "XQ phổi",
    mo_ta_benh_ly: "Thâm nhiễm mới thùy dưới phải",
    tieu_chuan_key: "imaging_chest",
    ...partial,
  };
}

describe("nkbv-pneu-timeline-verdict", () => {
  it("Index CDHA ∈ IWP → có hình ảnh; thiếu LS → NO_EVENT", () => {
    const ix = "2026-07-20";
    const v = buildPneuTimelineVerdict({
      indexKind: "CDHA",
      indexXn: null,
      indexCdha: xq({ id: "c1", ngay: ix }),
      cdha: [xq({ id: "c1", ngay: ix })],
      lamSang: {},
      canThiepDates: [],
      iwpDates: iwpAround(ix),
      nsk: ix,
      bloodCriterionIds: [],
    });
    expect(v.gate.hasImaging).toBe(true);
    expect(v.gate.imagingCount).toBeGreaterThanOrEqual(1);
    expect(v.result.classification).toBe("NO_EVENT");
    expect(v.criteriaMet).toBe(false);
    expect(v.gate.warnings.some((w) => /toàn thân|hô hấp/i.test(w))).toBe(true);
  });

  it("sputum + XQ + LS ≥2 + Vent ≥3d → PNU2_VAP", () => {
    const ix = "2026-07-20";
    const v = buildPneuTimelineVerdict({
      indexKind: "XN",
      indexXn: sputum({ id: "x1", ngay: ix }),
      indexCdha: null,
      cdha: [xq({ id: "c1", ngay: "2026-07-19" })],
      lamSang: {
        "2026-07-19": [
          { key: "fever_or_wbc", label: "Sốt/WBC" },
          { key: "cough", label: "Ho" },
          { key: "rales", label: "Ran" },
        ],
      },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwpAround(ix),
      nsk: "2026-07-19",
      bloodCriterionIds: [],
      devicePlacedDate: "2026-07-17",
    });
    expect(v.gate.microbiology).toBe("PNU2");
    expect(v.result.classification).toBe("PNU2_VAP");
    expect(v.criteriaMet).toBe(true);
  });

  it("XQ + LS đủ, không Vent → PNU1_NON_VAP", () => {
    const ix = "2026-07-20";
    const v = buildPneuTimelineVerdict({
      indexKind: "CDHA",
      indexXn: null,
      indexCdha: xq({ id: "c1", ngay: ix }),
      cdha: [xq({ id: "c1", ngay: ix })],
      lamSang: {
        "2026-07-20": [
          { key: "fever", label: "Sốt" },
          { key: "dyspnea", label: "Khó thở" },
          { key: "worsening_gas", label: "Giảm O2" },
        ],
      },
      canThiepDates: [],
      iwpDates: iwpAround(ix),
      nsk: ix,
      bloodCriterionIds: [],
    });
    expect(v.result.classification).toBe("PNU1_NON_VAP");
    expect(v.criteriaMet).toBe(true);
  });

  it("không imaging → NO_EVENT", () => {
    const ix = "2026-07-20";
    const v = buildPneuTimelineVerdict({
      indexKind: "XN",
      indexXn: sputum({ id: "x1", ngay: ix }),
      indexCdha: null,
      cdha: [],
      lamSang: {
        "2026-07-20": [
          { key: "fever_or_wbc", label: "Sốt" },
          { key: "cough", label: "Ho" },
          { key: "rales", label: "Ran" },
        ],
      },
      canThiepDates: [],
      iwpDates: iwpAround(ix),
      nsk: ix,
      bloodCriterionIds: [],
    });
    expect(v.gate.hasImaging).toBe(false);
    expect(v.result.classification).toBe("NO_EVENT");
    expect(v.gate.warnings.some((w) => /CĐHA|hình ảnh|imaging/i.test(w))).toBe(true);
  });

  it("bloodCriterionIds → PNU2; AMS catalog theo tuổi", () => {
    const ix = "2026-07-20";
    const blood: BaGridXnCell = {
      id: "b1",
      ngay: "2026-07-21",
      benh_pham: "Máu",
      vi_khuan: "S. aureus",
      source: "LIS",
    };
    const v = buildPneuTimelineVerdict({
      indexKind: "CDHA",
      indexXn: null,
      indexCdha: xq({ id: "c1", ngay: ix }),
      cdha: [xq({ id: "c1", ngay: ix })],
      lamSang: {
        "2026-07-20": [
          { key: "fever_or_wbc", label: "Sốt" },
          { key: "cough", label: "Ho" },
          { key: "purulent_sputum", label: "Đờm mủ" },
        ],
      },
      canThiepDates: [],
      iwpDates: iwpAround(ix),
      nsk: ix,
      bloodCriterionIds: ["b1"],
      bloodXn: [blood],
    });
    expect(v.result.classification).toBe("PNU2_NON_VAP");

    expect(shouldShowPneuAmsInCatalog(null)).toBe(true);
    expect(shouldShowPneuAmsInCatalog(45)).toBe(false);
    expect(shouldShowPneuAmsInCatalog(72)).toBe(true);
  });

  it("tim phổi nền + 1 phim → NO_EVENT; + 2 phim → OK", () => {
    const ix = "2026-07-20";
    const one = buildPneuTimelineVerdict({
      indexKind: "CDHA",
      indexXn: null,
      indexCdha: xq({ id: "c1", ngay: ix }),
      cdha: [xq({ id: "c1", ngay: ix })],
      lamSang: {
        "2026-07-20": [
          { key: "fever_or_wbc", label: "Sốt" },
          { key: "cough", label: "Ho" },
          { key: "rales", label: "Ran" },
        ],
      },
      canThiepDates: [],
      iwpDates: iwpAround(ix),
      nsk: ix,
      bloodCriterionIds: [],
      hasCardiopulmonaryDisease: true,
    });
    expect(one.result.classification).toBe("NO_EVENT");

    const two = buildPneuTimelineVerdict({
      indexKind: "CDHA",
      indexXn: null,
      indexCdha: xq({ id: "c1", ngay: ix }),
      cdha: [xq({ id: "c1", ngay: ix }), xq({ id: "c2", ngay: "2026-07-21" })],
      lamSang: {
        "2026-07-20": [
          { key: "fever_or_wbc", label: "Sốt" },
          { key: "cough", label: "Ho" },
          { key: "rales", label: "Ran" },
        ],
      },
      canThiepDates: [],
      iwpDates: iwpAround(ix),
      nsk: ix,
      bloodCriterionIds: [],
      hasCardiopulmonaryDisease: true,
    });
    expect(two.result.classification).toBe("PNU1_NON_VAP");
  });
});
