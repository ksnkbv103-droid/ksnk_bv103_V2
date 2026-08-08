import { describe, expect, it } from "vitest";
import {
  bareViSinhIdFromMilestoneId,
  countChuaPhanTich,
  resolveViSinhAnalysisStatus,
} from "./nkbv-vi-sinh-analysis-status";

describe("nkbv-vi-sinh-analysis-status", () => {
  it("strips lis: prefix", () => {
    expect(bareViSinhIdFromMilestoneId("lis:abc-123")).toBe("abc-123");
  });

  it("CHUA when no disposition", () => {
    expect(resolveViSinhAnalysisStatus("v1", [])).toBe("CHUA_PHAN_TICH");
  });

  it("DA_PHAN_TICH when phiếu gắn index", () => {
    expect(
      resolveViSinhAnalysisStatus("v1", [{ index_vi_sinh_id: "v1", is_active: true }]),
    ).toBe("DA_PHAN_TICH");
  });

  it("BO_QUA when disposition set", () => {
    expect(
      resolveViSinhAnalysisStatus("v1", [
        { index_vi_sinh_id: "v1", analysis_disposition: "BO_QUA", is_active: true },
      ]),
    ).toBe("BO_QUA");
  });

  it("counts unfinished positives", () => {
    expect(
      countChuaPhanTich(["a", "b", "c"], [
        { index_vi_sinh_id: "a", is_active: true },
        { index_vi_sinh_id: "c", analysis_disposition: "BO_QUA", is_active: true },
      ]),
    ).toBe(1);
  });
});
