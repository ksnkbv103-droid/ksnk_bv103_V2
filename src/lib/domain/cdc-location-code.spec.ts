import { describe, expect, it } from "vitest";
import { normalizeCdcLocationCode, summarizeCdcLocationCoverage } from "./cdc-location-code";

describe("cdc-location-code", () => {
  it("chuẩn hoá mã CDC Location, từ chối rỗng / lệch", () => {
    expect(normalizeCdcLocationCode("  in:icu  ")).toBe("IN:ICU");
    expect(normalizeCdcLocationCode("CC_ICU")).toBe("CC_ICU");
    expect(normalizeCdcLocationCode("")).toBeNull();
    expect(normalizeCdcLocationCode("x")).toBeNull();
    expect(normalizeCdcLocationCode("khoa hồi sức")).toBeNull();
  });

  it("đếm khoa đang dùng đã map vs chưa map", () => {
    expect(
      summarizeCdcLocationCoverage([
        { is_active: true, cdc_location_code: "IN:ICU" },
        { is_active: true, cdc_location_code: null },
        { is_active: false, cdc_location_code: "IN:WARD" },
      ]),
    ).toEqual({ totalActive: 2, mapped: 1 });
  });
});
