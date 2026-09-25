import { describe, expect, it } from "vitest";
import { pillStyleFromMauSac, resolveQlcvWorkflowBadgeAppearance } from "./qlcv-workflow-badge";

describe("qlcv-workflow-badge", () => {
  it("builds rgba pill from hex mau_sac", () => {
    const style = pillStyleFromMauSac("#026F17");
    expect(style?.backgroundColor).toContain("rgba(");
    expect(style?.borderColor).toContain("rgba(");
  });

  it("uses hardcoded SSOT mau_sac when map omitted", () => {
    const badge = resolveQlcvWorkflowBadgeAppearance({ trang_thai: "HOAN_THANH", is_active: true });
    expect(badge.style?.backgroundColor).toBeTruthy();
    expect(badge.className).not.toContain("emerald");
  });

  it("uses provided mau_sac map over SSOT", () => {
    const badge = resolveQlcvWorkflowBadgeAppearance(
      { trang_thai: "HOAN_THANH", is_active: true },
      { HOAN_THANH: "#026F17" },
    );
    expect(badge.style?.backgroundColor).toBeTruthy();
    expect(badge.className).not.toContain("emerald");
  });
});
