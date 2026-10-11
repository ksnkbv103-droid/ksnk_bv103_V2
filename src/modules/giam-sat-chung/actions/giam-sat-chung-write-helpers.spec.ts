import { describe, expect, it } from "vitest";
import { normalizeGscModeFields, parseNgayGiamSatOrNull, validateGscModeFields } from "./giam-sat-chung-write-helpers";

describe("giam-sat-chung-write-helpers", () => {
  it("parseNgayGiamSatOrNull", () => {
    expect(parseNgayGiamSatOrNull("2026-03-10")).toBe("2026-03-10");
    expect(parseNgayGiamSatOrNull("")).toBeNull();
    expect(parseNgayGiamSatOrNull("10/03/2026")).toBeNull();
    expect(parseNgayGiamSatOrNull("2026-13-45")).toBeNull();
    expect(parseNgayGiamSatOrNull(null)).toBeNull();
  });
  it("normalize: legacy khách quan và cách thức nhầm chỗ", () => {
    expect(normalizeGscModeFields({ hinh_thuc_giam_sat: "Giám sát khách quan", cach_thuc_giam_sat: "Giám sát lại qua camera" }).hinh).toBe(
      "Giám sát chuyên trách",
    );
    expect(normalizeGscModeFields({ hinh_thuc_giam_sat: "Giám sát trực tiếp qua camera" })).toEqual({
      hinh: "Giám sát chuyên trách",
      cach: "Giám sát trực tiếp qua camera",
      hinh_id: null,
      cach_id: null,
    });
  });
  it("validate", () => {
    expect(() => validateGscModeFields("Giám sát chéo", "Giám sát trực tiếp tại chỗ")).not.toThrow();
    expect(() => validateGscModeFields("x", "Giám sát trực tiếp tại chỗ")).toThrow(/Hình thức/);
    expect(() => validateGscModeFields("Tự giám sát", "x")).toThrow(/Cách thức/);
  });
});
