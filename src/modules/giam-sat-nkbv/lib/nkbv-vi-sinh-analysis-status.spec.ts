import { describe, expect, it } from "vitest";
import {
  bareViSinhIdFromMilestoneId,
  countChuaPhanTich,
  khongDuTcKetLuanLabel,
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

  it("DA_PHAN_TICH from metadata (RIT/SBAP attributed)", () => {
    expect(
      resolveViSinhAnalysisStatus("v2", [
        { index_vi_sinh_id: "v2", analysis_disposition: "DA_PHAN_TICH", is_active: true },
      ]),
    ).toBe("DA_PHAN_TICH");
  });

  it("KHONG_DU_TC when disposition set", () => {
    expect(
      resolveViSinhAnalysisStatus("v3", [
        {
          index_vi_sinh_id: "v3",
          analysis_disposition: "KHONG_DU_TC",
          is_active: true,
        },
      ]),
    ).toBe("KHONG_DU_TC");
  });

  it("khongDuTcKetLuanLabel = Không phải sự kiện tại ngày Index", () => {
    expect(khongDuTcKetLuanLabel("2026-07-30")).toBe("Không phải sự kiện tại ngày 30/7");
    expect(khongDuTcKetLuanLabel("")).toMatch(/Không phải sự kiện/);
  });

  it("counts unfinished positives", () => {
    expect(
      countChuaPhanTich(["a", "b", "c"], [
        { index_vi_sinh_id: "a", is_active: true },
        { index_vi_sinh_id: "c", analysis_disposition: "BO_QUA", is_active: true },
        { index_vi_sinh_id: "b", analysis_disposition: "DA_PHAN_TICH", is_active: true },
      ]),
    ).toBe(0);
  });
});
