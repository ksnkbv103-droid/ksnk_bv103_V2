import { describe, expect, it } from "vitest";
import { buildCssdQuyTrinhQrOrFilter } from "../shared/application/cssd-workflow-resolve";

describe("buildCssdQuyTrinhQrOrFilter", () => {
  it("includes cycle, permanent set, and legacy columns", () => {
    const f = buildCssdQuyTrinhQrOrFilter("bv103-cyc-250610-ab12cd34");
    expect(f).toContain("ma_cycle_qr.eq.BV103-CYC-250610-AB12CD34");
    expect(f).toContain("ma_qr_bo_vinh_vien.eq.BV103-CYC-250610-AB12CD34");
    expect(f).toContain("ma_qr_quy_trinh.eq.BV103-CYC-250610-AB12CD34");
  });
});
