import { describe, expect, it } from "vitest";
import {
  blockDeactivateForActiveCycles,
  countActiveCirculationCycles,
  isActiveCirculationCycle,
} from "./cssd-bo-active-cycle";

describe("cssd-bo-active-cycle", () => {
  it("chặn chu kỳ hiệu lực khác MAT, kể cả tinh_trang null", () => {
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: "BINH_THUONG" })).toBe(true);
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: null })).toBe(true);
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: "HONG" })).toBe(true);
  });

  it("không chặn MAT hoặc chu kỳ đã tắt", () => {
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: "MAT" })).toBe(false);
    expect(isActiveCirculationCycle({ is_active: false, tinh_trang: "BINH_THUONG" })).toBe(false);
    expect(isActiveCirculationCycle({ is_active: null, tinh_trang: "BINH_THUONG" })).toBe(false);
  });

  it("đếm và chỉ chặn khi còn ít nhất một chu kỳ", () => {
    const rows = [
      { is_active: true, tinh_trang: "MAT" },
      { is_active: false, tinh_trang: "BINH_THUONG" },
      { is_active: true, tinh_trang: "BINH_THUONG" },
      { is_active: true, tinh_trang: null },
    ];
    expect(countActiveCirculationCycles(rows)).toBe(2);
    expect(blockDeactivateForActiveCycles(0)).toBeNull();
    expect(blockDeactivateForActiveCycles(2)).toMatch(/còn 2 chu kỳ/);
  });
});
