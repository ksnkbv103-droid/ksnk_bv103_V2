import { describe, expect, it } from "vitest";
import { emptyClipAdherence, parseClipAdherence, scoreClipAdherence } from "./nkbv-clip";

describe("nkbv-clip", () => {
  it("scores incomplete CLIP", () => {
    const s = scoreClipAdherence(emptyClipAdherence());
    expect(s.adherent).toBe(false);
    expect(s.completedCount).toBe(0);
  });

  it("scores full CLIP adherent", () => {
    const s = scoreClipAdherence({
      hand_hygiene: true,
      maximal_barrier: true,
      skin_prep: "CHG",
      dry_before_incision: true,
    });
    expect(s.adherent).toBe(true);
    expect(s.missing).toHaveLength(0);
  });

  it("parses metadata blob", () => {
    const a = parseClipAdherence({
      hand_hygiene: true,
      maximal_barrier: false,
      skin_prep: "chg",
      dry_before_incision: true,
    });
    expect(a.skin_prep).toBe("CHG");
    expect(a.maximal_barrier).toBe(false);
  });
});
