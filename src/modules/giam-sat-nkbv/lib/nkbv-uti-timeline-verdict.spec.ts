import { describe, expect, it } from "vitest";
import {
  ageYearsFromNgaySinh,
  buildUtiTimelineVerdict,
  gateUtiIndexLab,
  parseUrineCfu,
  stripUtiVoidingFromLamSang,
} from "./nkbv-uti-timeline-verdict";
import type { BaGridXnCell } from "./nkbv-ba-grid-engine";

function urine(partial: Partial<BaGridXnCell> & { id: string; ngay: string }): BaGridXnCell {
  return {
    benh_pham: "Nước tiểu",
    vi_khuan: "E. coli",
    so_luong: "10^5",
    source: "LIS",
    ...partial,
  };
}

describe("nkbv-uti-timeline-verdict", () => {
  it("parseUrineCfu: 10^5 / số thuần", () => {
    expect(parseUrineCfu("10^5")).toBe(100000);
    expect(parseUrineCfu(">=10^5 CFU/ml")).toBe(100000);
    expect(parseUrineCfu("150000")).toBe(150000);
    expect(parseUrineCfu(null)).toBeNull();
  });

  it("gate Index: nấm → không ok; CFU thấp → cảnh báo", () => {
    const yeast = gateUtiIndexLab(
      urine({ id: "u1", ngay: "2026-07-20", vi_khuan: "Candida albicans" }),
    );
    expect(yeast.yeast).toBe(true);
    expect(yeast.cfuOk).toBe(false);

    const low = gateUtiIndexLab(
      urine({ id: "u2", ngay: "2026-07-20", so_luong: "1000" }),
    );
    expect(low.cfuOk).toBe(false);
  });

  it("strip voiding khi Foley ngày đó", () => {
    const next = stripUtiVoidingFromLamSang(
      {
        "2026-07-20": [
          { key: "fever", label: "Sốt" },
          { key: "dysuria", label: "Buốt" },
        ],
        "2026-07-21": [{ key: "urgency", label: "Gấp" }],
      },
      ["2026-07-20"],
    );
    expect(next["2026-07-20"]?.map((x) => x.key)).toEqual(["fever"]);
    expect(next["2026-07-21"]?.map((x) => x.key)).toEqual(["urgency"]);
  });

  it("CAUTI_SUTI: Foley ≥3d + sốt ∈ IWP + CFU đủ", () => {
    const iwp = new Set([
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
    ]);
    const v = buildUtiTimelineVerdict({
      indexXn: urine({ id: "u", ngay: "2026-07-20", so_luong: "10^5" }),
      lamSang: { "2026-07-19": [{ key: "fever", label: "Sốt" }] },
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwp,
      nsk: "2026-07-19",
      bloodXn: [],
      abutiBloodIds: [],
      devicePlacedDate: "2026-07-17",
    });
    expect(v.result.classification).toBe("CAUTI_SUTI");
    expect(v.criteriaMet).toBe(true);
  });

  it("SUTI non-catheter + dysuria", () => {
    const iwp = new Set(["2026-07-18", "2026-07-19", "2026-07-20", "2026-07-21"]);
    const v = buildUtiTimelineVerdict({
      indexXn: urine({ id: "u", ngay: "2026-07-20" }),
      lamSang: { "2026-07-20": [{ key: "dysuria", label: "Buốt" }] },
      canThiepDates: [],
      iwpDates: iwp,
      nsk: "2026-07-20",
      bloodXn: [],
      abutiBloodIds: [],
    });
    expect(v.result.classification).toBe("SUTI");
  });

  it("Foley + dysuria bị bỏ → ASB nếu không sx khác", () => {
    const iwp = new Set(["2026-07-18", "2026-07-19", "2026-07-20"]);
    const v = buildUtiTimelineVerdict({
      indexXn: urine({ id: "u", ngay: "2026-07-20" }),
      lamSang: { "2026-07-20": [{ key: "dysuria", label: "Buốt" }] },
      canThiepDates: ["2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwp,
      nsk: "2026-07-20",
      bloodXn: [],
      abutiBloodIds: [],
      devicePlacedDate: "2026-07-18",
    });
    expect(v.result.classification).toBe("ASB");
    expect(v.criteriaMet).toBe(false);
  });

  it("ABUTI khi tick máu match", () => {
    const iwp = new Set(["2026-07-18", "2026-07-19", "2026-07-20", "2026-07-21"]);
    const blood: BaGridXnCell = {
      id: "b1",
      ngay: "2026-07-21",
      benh_pham: "Máu",
      vi_khuan: "E. coli",
      source: "LIS",
    };
    const v = buildUtiTimelineVerdict({
      indexXn: urine({ id: "u", ngay: "2026-07-20" }),
      lamSang: {},
      canThiepDates: ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"],
      iwpDates: iwp,
      nsk: "2026-07-20",
      bloodXn: [blood],
      abutiBloodIds: ["b1"],
      devicePlacedDate: "2026-07-17",
    });
    expect(v.result.classification).toBe("CAUTI_ABUTI");
    expect(v.result.is_secondary_bsi).toBe(true);
  });

  it("ageYearsFromNgaySinh ≤1 → infant", () => {
    expect(ageYearsFromNgaySinh("2025-06-01", "2026-07-20")).toBe(1);
    expect(ageYearsFromNgaySinh("2020-01-01", "2026-07-20")).toBeGreaterThan(1);
  });
});
