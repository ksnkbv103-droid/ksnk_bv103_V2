import { describe, expect, it } from "vitest";
import {
  HINH_THUC_KHACH_QUAN_LEGACY,
  isLegacyKhachQuanHinhThuc,
  resolveCanonicalHinhThucLabel,
} from "./supervision-hinh-thuc-legacy";

describe("supervision-hinh-thuc-legacy", () => {
  it("map khách quan → chuyên trách", () => {
    expect(resolveCanonicalHinhThucLabel(HINH_THUC_KHACH_QUAN_LEGACY)).toBe("Giám sát chuyên trách");
    expect(isLegacyKhachQuanHinhThuc("  Giám sát khách quan ")).toBe(true);
  });
});
