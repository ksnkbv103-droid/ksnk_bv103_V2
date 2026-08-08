import { describe, expect, it } from "vitest";
import { buildCssdQuyTrinhQrOrFilter } from "../shared/domain/cssd-qr-core";

describe("buildCssdQuyTrinhQrOrFilter", () => {
  it("includes cycle and unified bo columns", () => {
    const f = buildCssdQuyTrinhQrOrFilter("b01.set.01");
    expect(f).toContain("ma_cycle_qr.eq.B01.SET.01");
    expect(f).toContain("ma_qr_bo_vinh_vien.eq.B01.SET.01");
    expect(f).toContain("ma_qr_quy_trinh.eq.B01.SET.01");
  });
});
