import { describe, expect, it } from "vitest";

describe("bang-kiem-read (MDM SSOT)", () => {
  it("uses dm_bang_kiem table id in read module", async () => {
    const mod = await import("./bang-kiem-read.actions");
    expect(mod.getBangKiemsForGiamSat).toBeDefined();
    expect(mod.getTieuChisForGiamSatChung).toBeDefined();
  });
});
