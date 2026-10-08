import { describe, expect, it } from "vitest";
import { CSSD_MAY_COUNTS_LABEL, formatCssdMayReadyRepairing } from "./cssd-may-counts";

describe("formatCssdMayReadyRepairing", () => {
  it("in hai đếm sẵn / sửa, không gộp mẫu số", () => {
    expect(formatCssdMayReadyRepairing(3, 2)).toBe("3 / 2");
    expect(CSSD_MAY_COUNTS_LABEL).toBe("Máy sẵn sàng / sửa·BT");
  });
});
