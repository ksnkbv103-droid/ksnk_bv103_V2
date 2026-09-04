import { describe, expect, it } from "vitest";
import {
  assertLamSachLotSoftGate,
  pickLamSachLotFromPayload,
} from "./cssd-lam-sach-lot-gate";

describe("assertLamSachLotSoftGate (QT.18 soft)", () => {
  it("no warning when enzyme lot present", () => {
    const r = assertLamSachLotSoftGate({ enzymeLot: "ENZ-2026-01", washerMachineId: null });
    expect(r.ok).toBe(true);
    expect("warning" in r).toBe(false);
  });

  it("no warning when washer id present", () => {
    const r = assertLamSachLotSoftGate({ enzymeLot: "", washerMachineId: "tb-washer-1" });
    expect(r.ok).toBe(true);
    expect("warning" in r).toBe(false);
  });

  it("soft-warns (still ok) when both missing — does not hard-block", () => {
    const r = assertLamSachLotSoftGate({});
    expect(r.ok).toBe(true);
    expect("warning" in r && r.warning).toMatch(/QT\.18.*lot enzyme/i);
  });
});

describe("pickLamSachLotFromPayload", () => {
  it("reads snake + camel aliases", () => {
    expect(pickLamSachLotFromPayload({ enzyme_lot: "L1" }).enzymeLot).toBe("L1");
    expect(pickLamSachLotFromPayload({ washerMachineId: "W1" }).washerMachineId).toBe("W1");
    expect(pickLamSachLotFromPayload({ ma_lo_enzyme: "E2", thiet_bi_rua_id: "T2" })).toEqual({
      enzymeLot: "E2",
      washerMachineId: "T2",
    });
  });
});
