import { describe, expect, it } from "vitest";
import {
  pctCongViecForRollup,
  pctKeHoachFromNhiemVu,
  pctMocFromTasks,
  pctNhiemVuFromTree,
} from "./qlcv-progress-rollup";

describe("qlcv-progress-rollup", () => {
  it("pctCongViec: HOAN_THANH=100, DA_HUY null", () => {
    expect(pctCongViecForRollup({ id: "1", trang_thai: "HOAN_THANH", phan_tram_hoan_thanh: 40 })).toBe(
      100,
    );
    expect(pctCongViecForRollup({ id: "2", trang_thai: "DA_HUY", phan_tram_hoan_thanh: 40 })).toBeNull();
    expect(pctCongViecForRollup({ id: "3", trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 50 })).toBe(50);
  });

  it("% nhiệm vụ = TB mọi việc con (không bắt mốc)", () => {
    const tasks = [
      {
        id: "a",
        nhiem_vu_id: "nv1",
        moc_id: "m1",
        trang_thai: "HOAN_THANH",
        phan_tram_hoan_thanh: 0,
        is_active: true,
      },
      {
        id: "b",
        nhiem_vu_id: "nv1",
        moc_id: "m1",
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 50,
        is_active: true,
      },
      {
        id: "c",
        nhiem_vu_id: "nv1",
        moc_id: "m2",
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 0,
        is_active: true,
      },
    ];
    const mocs = [
      { id: "m1", nhiem_vu_id: "nv1", is_active: true },
      { id: "m2", nhiem_vu_id: "nv1", is_active: true },
    ];
    expect(pctMocFromTasks("m1", tasks).pct).toBe(75);
    const nv = pctNhiemVuFromTree("nv1", mocs, tasks);
    // 100 + 50 + 0 → 50
    expect(nv.pct).toBe(50);
    expect(nv.taskCount).toBe(3);
    expect(nv.taskDoneCount).toBe(1);
    const year = pctKeHoachFromNhiemVu(
      ["nv1"],
      [{ id: "nv1", trang_thai: "DANG_LAM", is_active: true }],
      mocs,
      tasks,
    );
    expect(year.pct).toBe(50);
  });

  it("việc gắn thẳng nhiệm vụ (không moc) vẫn rollup", () => {
    const tasks = [
      {
        id: "a",
        nhiem_vu_id: "nv1",
        moc_id: null,
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 80,
        is_active: true,
      },
      {
        id: "b",
        nhiem_vu_id: "nv1",
        moc_id: null,
        trang_thai: "HOAN_THANH",
        phan_tram_hoan_thanh: 0,
        is_active: true,
      },
    ];
    const r = pctNhiemVuFromTree("nv1", [], tasks);
    expect(r.pct).toBe(90);
    expect(r.taskCount).toBe(2);
    expect(r.taskDoneCount).toBe(1);
  });
});
