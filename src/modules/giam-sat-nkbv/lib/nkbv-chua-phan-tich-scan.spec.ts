import { describe, expect, it } from "vitest";
import {
  chunkStrings,
  collectChuaPhanTichBaKeysFromScan,
  isPositiveViSinhRow,
  normalizeChuaPhanTichBaKeys,
} from "./nkbv-chua-phan-tich-scan";

describe("nkbv-chua-phan-tich-scan", () => {
  it("classifies positives", () => {
    expect(isPositiveViSinhRow({ ket_qua_phan_loai: "AM_TINH" })).toBe(false);
    expect(isPositiveViSinhRow({ ket_qua_phan_loai: "DUONG_TINH" })).toBe(true);
    expect(isPositiveViSinhRow({ ket_qua_duong_tinh: true })).toBe(true);
    expect(isPositiveViSinhRow({ tac_nhan: "E.coli", ket_qua_phan_loai: "" })).toBe(true);
  });

  it("chunks ids", () => {
    expect(chunkStrings(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("normalizes BA keys from rpc", () => {
    expect(normalizeChuaPhanTichBaKeys(null)).toEqual([]);
    expect(normalizeChuaPhanTichBaKeys([" BA1 ", "BA1", "", "BA2"])).toEqual(["BA1", "BA2"]);
  });

  it("fallback scan: BA còn XN (+) chưa gắn phiếu", () => {
    const keys = collectChuaPhanTichBaKeysFromScan({
      viSinhRows: [
        { id: "v1", ma_benh_an: "BA1", ket_qua_phan_loai: "DUONG_TINH" },
        { id: "v2", ma_benh_an: "BA2", ket_qua_phan_loai: "DUONG_TINH" },
      ],
      caseRows: [
        { verification_data: { index_vi_sinh_id: "v2" }, is_active: true },
      ],
    });
    expect(keys).toEqual(["BA1"]);
  });
});
