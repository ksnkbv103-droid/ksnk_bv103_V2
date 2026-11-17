import { describe, expect, it } from "vitest";
import { defaultSourceView } from "./supervision-source-tabs";
import { TGS_OVER_KSNK_ALERT_POINTS } from "./supervision-thresholds";

describe("supervision-source-tabs", () => {
  it("người khoa (bị khóa khoa) mở Tự giám sát, KSNK mở Chuyên trách", () => {
    expect(defaultSourceView(true)).toBe("tgs");
    expect(defaultSourceView(false)).toBe("ksnk");
    expect(defaultSourceView(undefined)).toBe("ksnk");
  });
  it("ngưỡng tự chấm cao hơn chuyên trách là 10 điểm", () => {
    expect(TGS_OVER_KSNK_ALERT_POINTS).toBe(10);
  });
});
