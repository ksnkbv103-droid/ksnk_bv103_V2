import { describe, expect, it } from "vitest";
import {
  FAULT_STATION_OPERATOR_COLS,
  isInstrumentIncidentImageRequired,
  listCyclePerformers,
  readFaultStationOperator,
} from "./cssd-incident-trace";

describe("cssd-incident-trace", () => {
  it("maps fault station to operator columns", () => {
    expect(FAULT_STATION_OPERATOR_COLS.QC.nguoiCol).toBe("nguoi_kiem_tra_id");
    expect(FAULT_STATION_OPERATOR_COLS.DONG_GOI.thoiGianCol).toBe("thoi_gian_dong_goi");
  });

  it("reads operator id and station time from quy trinh row", () => {
    const row = {
      nguoi_lam_sach_id: "ns-1",
      thoi_gian_lam_sach: "2026-07-03T10:00:00Z",
    };
    expect(readFaultStationOperator(row, "LAM_SACH")).toEqual({
      operatorId: "ns-1",
      stationTime: "2026-07-03T10:00:00Z",
    });
  });

  it("lists unique performers across stations on a cycle", () => {
    const row = {
      nguoi_tiep_nhan_id: "ns-a",
      thoi_gian_tiep_nhan: "2026-08-01T08:00:00Z",
      nguoi_lam_sach_id: "ns-b",
      thoi_gian_lam_sach: "2026-08-01T09:00:00Z",
      nguoi_dong_goi_id: "ns-a",
      thoi_gian_dong_goi: "2026-08-01T10:00:00Z",
    };
    expect(listCyclePerformers(row)).toEqual([
      { station: "TIEP_NHAN", operatorId: "ns-a", stationTime: "2026-08-01T08:00:00Z" },
      { station: "LAM_SACH", operatorId: "ns-b", stationTime: "2026-08-01T09:00:00Z" },
    ]);
  });

  it("requires image for broken and replenish instrument incidents", () => {
    expect(isInstrumentIncidentImageRequired("INSTRUMENT_BROKEN")).toBe(true);
    expect(isInstrumentIncidentImageRequired("INSTRUMENT_REPLENISH")).toBe(true);
    expect(isInstrumentIncidentImageRequired("INSTRUMENT_MISSING")).toBe(false);
    expect(isInstrumentIncidentImageRequired("INSTRUMENT_TRANSFER")).toBe(false);
  });
});
