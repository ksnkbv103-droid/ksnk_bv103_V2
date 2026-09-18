import { describe, expect, it } from "vitest";
import {
  ACTION_BOARD_MIN_SAMPLE,
  buildActionBoardModel,
  pickHighest,
  pickLowest,
  rankRowsFromMatrixKhoa,
  vstErrorsFromMoments,
  gscErrorsFromTopViolations,
} from "./supervision-action-board";

describe("supervision-action-board", () => {
  it("exposes locked min-sample thresholds", () => {
    expect(ACTION_BOARD_MIN_SAMPLE.vst).toBe(20);
    expect(ACTION_BOARD_MIN_SAMPLE.gsc).toBe(30);
  });

  it("filters zero volume and picks lowest / highest with min sample", () => {
    const rows = rankRowsFromMatrixKhoa(
      [
        { ten: "Khoa A", tong_co_hoi: 5, da_tuan_thu: 5, ty_le_tuan_thu: 100 },
        { ten: "Khoa B", tong_co_hoi: 40, da_tuan_thu: 10, ty_le_tuan_thu: 25 },
        { ten: "Khoa C", tong_co_hoi: 50, da_tuan_thu: 48, ty_le_tuan_thu: 96 },
        { ten: "Khoa D", tong_co_hoi: 0, da_tuan_thu: 0, ty_le_tuan_thu: 0 },
      ],
      "vst",
    );
    expect(rows).toHaveLength(3);
    expect(pickLowest(rows, 20, 5).map((r) => r.ten)).toEqual(["Khoa B", "Khoa C"]);
    expect(pickHighest(rows, 20, 5).map((r) => r.ten)).toEqual(["Khoa C", "Khoa B"]);
  });

  it("builds VST model with moments as errors", () => {
    const model = buildActionBoardModel({
      source: "vst",
      matrixKhoa: [
        { ten: "X", tong_co_hoi: 25, da_tuan_thu: 5, ty_le_tuan_thu: 20 },
        { ten: "Y", tong_co_hoi: 40, da_tuan_thu: 38, ty_le_tuan_thu: 95 },
      ],
      moments: [
        { ten: "Trước tiếp xúc", tong_co_hoi: 30, da_tuan_thu: 12, ty_le_tuan_thu: 40 },
        { ten: "Sau tiếp xúc", tong_co_hoi: 30, da_tuan_thu: 28, ty_le_tuan_thu: 93.3 },
      ],
      vstKpis: { loi_ky_thuat: 4, bo_sot: 2, tong_co_hoi: 100 },
    });
    expect(model.lowest[0]?.ten).toBe("X");
    expect(model.highest[0]?.ten).toBe("Y");
    expect(model.errors[0]?.ten).toBe("Trước tiếp xúc");
    expect(model.errors.some((e) => e.ten.includes("Lỗi kỹ thuật"))).toBe(true);
  });

  it("builds GSC model from top violations", () => {
    const errs = gscErrorsFromTopViolations([
      { ten_tieu_chi: "Tiêu chí Z", ma_bk: "BK1", so_vi_pham: 3, ty_le_vi_pham: 50 },
      { ten_tieu_chi: "Tiêu chí A", ma_bk: "BK1", so_vi_pham: 10, ty_le_vi_pham: 80 },
    ]);
    expect(errs[0]?.ten).toBe("Tiêu chí A");
    expect(errs[0]?.count).toBe(10);

    const model = buildActionBoardModel({
      source: "gsc",
      matrixKhoa: [
        { ten: "K1", tong_quan_sat: 40, tong_dat: 10, ty_le_tuan_thu: 25 },
        { ten: "K2", tong_quan_sat: 50, tong_dat: 48, ty_le_tuan_thu: 96 },
      ],
      topViolations: [
        { ten_tieu_chi: "Tiêu chí A", ma_bk: "BK1", so_vi_pham: 10, ty_le_vi_pham: 80 },
      ],
    });
    expect(model.lowest[0]?.ten).toBe("K1");
    expect(model.highest[0]?.ten).toBe("K2");
    expect(model.errors).toHaveLength(1);
  });

  it("vstErrorsFromMoments sorts worst moments first", () => {
    const errs = vstErrorsFromMoments([
      { ten: "M2", tong_co_hoi: 10, da_tuan_thu: 9, ty_le_tuan_thu: 90 },
      { ten: "M1", tong_co_hoi: 10, da_tuan_thu: 2, ty_le_tuan_thu: 20 },
    ]);
    expect(errs[0]?.ten).toBe("M1");
  });
});
