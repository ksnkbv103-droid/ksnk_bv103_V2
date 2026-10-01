import { describe, expect, it } from "vitest";
import {
  buildClearAfterKeepPatch,
  buildClearStationsPatch,
  collectStationStampSnapshot,
  listStationStampSelectColumns,
  stationsToClearAfter,
} from "./cssd-station-clear";

describe("cssd-station-clear", () => {
  it("reject one-step: clear only undone current station", () => {
    expect(stationsToClearAfter("QC", "DONG_GOI")).toEqual(["DONG_GOI"]);
    expect(stationsToClearAfter("TIEP_NHAN", "LAM_SACH")).toEqual(["LAM_SACH"]);
    expect(stationsToClearAfter("LAM_SACH", "LAM_SACH")).toEqual([]);
  });

  it("domino: clear stations strictly after keep through current", () => {
    expect(stationsToClearAfter("LAM_SACH", "CAP_PHAT")).toEqual([
      "QC",
      "DONG_GOI",
      "TIET_KHUAN",
      "CAP_PHAT",
    ]);
    expect(stationsToClearAfter("DONG_GOI", "DONG_GOI")).toEqual([]);
  });

  it("buildClearStationsPatch nulls stamps + DONG_GOI extras", () => {
    const patch = buildClearStationsPatch(["DONG_GOI"]);
    expect(patch).toMatchObject({
      thoi_gian_dong_goi: null,
      nguoi_dong_goi_id: null,
      ma_cycle_qr: null,
      bom_kiem_dem_at: null,
      bom_kiem_dem_boi_id: null,
    });
    expect(buildClearStationsPatch(["QC"])).toEqual({
      thoi_gian_qc: null,
      nguoi_kiem_tra_id: null,
    });
  });

  it("buildClearAfterKeepPatch bundles stations + patch", () => {
    const { stations, patch } = buildClearAfterKeepPatch("QC", "TIET_KHUAN");
    expect(stations).toEqual(["DONG_GOI", "TIET_KHUAN"]);
    expect(patch.thoi_gian_dong_goi).toBeNull();
    expect(patch.thoi_gian_tiet_khuan).toBeNull();
    expect(patch.ma_cycle_qr).toBeNull();
  });

  it("snapshot keeps only non-empty before values", () => {
    const stations = stationsToClearAfter("QC", "DONG_GOI");
    const cols = listStationStampSelectColumns(stations);
    expect(cols).toContain("thoi_gian_dong_goi");
    expect(cols).toContain("ma_cycle_qr");
    const snap = collectStationStampSnapshot(
      {
        thoi_gian_dong_goi: "2026-09-28T10:00:00Z",
        nguoi_dong_goi_id: "ns-1",
        ma_cycle_qr: "B01.SET.01",
        bom_kiem_dem_at: null,
        bom_kiem_dem_boi_id: "  ",
      },
      stations,
    );
    expect(snap).toEqual({
      thoi_gian_dong_goi: "2026-09-28T10:00:00Z",
      nguoi_dong_goi_id: "ns-1",
      ma_cycle_qr: "B01.SET.01",
    });
  });
});
