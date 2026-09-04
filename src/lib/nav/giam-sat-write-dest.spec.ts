import { describe, expect, it } from "vitest";
import {
  GIAM_SAT_HUB_HREF,
  isGiamSatNavPath,
  listVisibleGiamSatWriteDests,
  pickSoleWriteHrefForMode,
  resolveGiamSatSidebarHref,
} from "./giam-sat-write-dest";

describe("giam-sat-write-dest", () => {
  const can =
    (...keys: string[]) =>
    (m: string) =>
      keys.includes(m);

  it("sidebar deep-links when exactly one write gate", () => {
    expect(resolveGiamSatSidebarHref(false, can("GIAM_SAT_VST"))).toBe("/giam-sat-vst");
    expect(resolveGiamSatSidebarHref(false, can("GIAM_SAT_CHUNG"))).toBe(
      "/giam-sat-chung/tuan-thu",
    );
    expect(resolveGiamSatSidebarHref(false, can("GIAM_SAT_NKBV"))).toBe("/giam-sat-nkbv");
  });

  it("sidebar stays on hub when multiple write gates or admin", () => {
    expect(
      resolveGiamSatSidebarHref(false, can("GIAM_SAT_VST", "GIAM_SAT_CHUNG")),
    ).toBe(GIAM_SAT_HUB_HREF);
    expect(resolveGiamSatSidebarHref(true, can())).toBe(GIAM_SAT_HUB_HREF);
  });

  it("mode=write skips hub only for sole write dest", () => {
    expect(pickSoleWriteHrefForMode("write", ["/giam-sat-vst"])).toBe("/giam-sat-vst");
    expect(pickSoleWriteHrefForMode("write", ["/a", "/b"])).toBeNull();
    expect(pickSoleWriteHrefForMode(null, ["/giam-sat-vst"])).toBeNull();
    expect(pickSoleWriteHrefForMode("read", ["/giam-sat-vst"])).toBeNull();
  });

  it("lists visible dests without inventing extras", () => {
    expect(listVisibleGiamSatWriteDests(false, can("GIAM_SAT_NKBV")).map((d) => d.id)).toEqual([
      "nkbv",
    ]);
  });

  it("isGiamSatNavPath covers hub + module deep-links", () => {
    expect(isGiamSatNavPath("/giam-sat")).toBe(true);
    expect(isGiamSatNavPath("/giam-sat-vst")).toBe(true);
    expect(isGiamSatNavPath("/cssd-quy-trinh")).toBe(false);
  });
});
