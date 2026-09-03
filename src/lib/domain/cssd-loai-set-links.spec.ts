import { describe, expect, it } from "vitest";
import { boIdsFromChua, normalizeBoDungCuChua, soLuongTrongBo } from "./cssd-loai-set-links";

describe("cssd-loai-set-links", () => {
  it("derives in-set qty as tổng − kho lẻ", () => {
    expect(soLuongTrongBo(1, 0)).toBe(1);
    expect(soLuongTrongBo(3, 1)).toBe(2);
    expect(soLuongTrongBo(0, 0)).toBe(0);
    expect(soLuongTrongBo(1, 5)).toBe(0);
  });

  it("normalizes bo_dung_cu_chua from array or JSON string and drops empty id", () => {
    expect(normalizeBoDungCuChua(null)).toEqual([]);
    expect(normalizeBoDungCuChua([])).toEqual([]);
    expect(
      normalizeBoDungCuChua([
        { id: "a", ma_bo: "B01", ten_bo: "Bộ A", so_luong: 2 },
        { id: "a", ma_bo: "dup" },
        { id: "", ma_bo: "skip" },
      ]),
    ).toEqual([{ id: "a", ma_bo: "B01", ten_bo: "Bộ A", so_luong: 2 }]);
    expect(normalizeBoDungCuChua('[{"id":"x","ma_bo":"B02","ten_bo":"Hai"}]')).toEqual([
      { id: "x", ma_bo: "B02", ten_bo: "Hai", so_luong: null },
    ]);
    expect(boIdsFromChua([{ id: "a", ma_bo: "B01", ten_bo: "A" }])).toEqual(["a"]);
  });
});
