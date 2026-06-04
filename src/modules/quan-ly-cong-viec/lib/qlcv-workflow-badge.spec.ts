import { describe, expect, it } from "vitest";
import { pillStyleFromMauSac, resolveQlcvWorkflowBadgeAppearance } from "./qlcv-workflow-badge";

describe("qlcv-workflow-badge", () => {
  it("builds rgba pill from hex mau_sac", () => {
    const style = pillStyleFromMauSac("#026F17");
    expect(style?.backgroundColor).toContain("rgba(");
    expect(style?.borderColor).toContain("rgba(");
  });

  it("falls back to tailwind when no mau_sac map", () => {
    const badge = resolveQlcvWorkflowBadgeAppearance({ trang_thai: "HOAN_THANH", is_active: true });
    expect(badge.className).toContain("emerald");
  });

  it("uses MDM mau_sac when map provided", () => {
    const badge = resolveQlcvWorkflowBadgeAppearance(
      { trang_thai: "HOAN_THANH", is_active: true },
      { HOAN_THANH: "#026F17" },
    );
    expect(badge.style?.backgroundColor).toBeTruthy();
    expect(badge.className).not.toContain("emerald");
  });
});
