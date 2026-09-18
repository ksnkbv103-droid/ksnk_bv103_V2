import { describe, expect, it } from "vitest";
import {
  applyRuledOutFields,
  evaluateRuledOut,
  hasRuledOutTicks,
  inheritRuledOutFields,
  pneuVentAssociationBadge,
  pneuVentAssociationLabel,
  toggleRuledOutReason,
} from "./nkbv-ruled-out";

describe("nkbv-ruled-out", () => {
  it("không tick → không Ruled-out", () => {
    expect(hasRuledOutTicks({})).toBe(false);
    expect(evaluateRuledOut({}, "PNEU")).toBeNull();
  });

  it("tick xẹp phổi → RULED_OUT, không vào tử số", () => {
    const res = evaluateRuledOut({ ruled_out_reasons: ["atelectasis"] }, "PNEU");
    expect(res?.is_positive).toBe(false);
    expect(res?.classification).toBe("RULED_OUT");
    expect(res?.reason).toMatch(/Xẹp phổi/);
  });

  it("inherit không thổi lý do từ dữ liệu trống", () => {
    expect(inheritRuledOutFields({})).toEqual({ ruled_out: false });
    expect(inheritRuledOutFields({ ruled_out_reasons: ["asb_no_blood"] }).ruled_out).toBe(true);
  });

  it("toggle thêm/bớt mã lý do", () => {
    expect(toggleRuledOutReason(["atelectasis"], "gram_inadequate", true)).toEqual([
      "atelectasis",
      "gram_inadequate",
    ]);
    expect(toggleRuledOutReason(["atelectasis"], "atelectasis", false)).toEqual([]);
  });

  it("applyRuledOutFields chỉ gắn khi có lý do", () => {
    const base = { ruled_out: false as boolean | undefined };
    expect(applyRuledOutFields(base, { reasons: [] })).toEqual(base);
    expect(applyRuledOutFields(base, { reasons: ["asb_no_blood"] }).ruled_out).toBe(true);
  });

  it("badge VAP / HAP nhận cả NON_VAP", () => {
    expect(pneuVentAssociationBadge("PNU1_VAP")).toBe("VAP");
    expect(pneuVentAssociationBadge("PNU1_NON_VAP")).toBe("HAP");
    expect(pneuVentAssociationBadge("PNU2_HAP")).toBe("HAP");
    expect(pneuVentAssociationBadge("NO_EVENT")).toBeNull();
    expect(pneuVentAssociationLabel("PNU1_NON_VAP")).toBe("HAP — không máy");
  });
});
