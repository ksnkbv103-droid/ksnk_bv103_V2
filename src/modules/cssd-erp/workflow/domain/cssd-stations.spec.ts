import { describe, expect, it } from "vitest";
import {
  SCAN_STATIONS,
  STATION_LABEL,
  WORKFLOW_STEPS,
  isCssdStation,
  nextStationLabel,
  nextWorkflowStation,
  previousWorkflowStation,
  stationLabel,
} from "./cssd-stations";

describe("cssd-stations SSOT", () => {
  it("locks exactly 6 workflow stations in Domain order", () => {
    expect([...WORKFLOW_STEPS]).toEqual([
      "TIEP_NHAN",
      "LAM_SACH",
      "QC",
      "DONG_GOI",
      "TIET_KHUAN",
      "CAP_PHAT",
    ]);
    expect(WORKFLOW_STEPS).toHaveLength(6);
    expect(Object.keys(STATION_LABEL)).toHaveLength(6);
  });

  it("SCAN_STATIONS omits TIET_KHUAN (mẻ only)", () => {
    expect(SCAN_STATIONS).not.toContain("TIET_KHUAN");
    expect(SCAN_STATIONS).toHaveLength(5);
  });

  it("stationLabel resolves codes; unknown falls back", () => {
    expect(stationLabel("QC")).toBe("Kiểm bộ");
    expect(stationLabel("tiep_nhan")).toBe("Tiếp nhận");
    expect(stationLabel("")).toBe("—");
    expect(stationLabel("FOO_BAR")).toBe("FOO BAR");
  });

  it("isCssdStation", () => {
    expect(isCssdStation("DONG_GOI")).toBe(true);
    expect(isCssdStation("NOPE")).toBe(false);
  });

  it("nextStationLabel uses SSOT labels (not raw code)", () => {
    expect(nextStationLabel("TIEP_NHAN")).toBe("Làm sạch");
    expect(nextStationLabel("DONG_GOI")).toMatch(/Mẻ tiệt khuẩn/);
    expect(nextStationLabel("CAP_PHAT")).toMatch(/Hoàn chu kỳ/);
  });

  it("previous/next helpers", () => {
    expect(previousWorkflowStation("QC")).toBe("LAM_SACH");
    expect(nextWorkflowStation("QC")).toBe("DONG_GOI");
  });
});
