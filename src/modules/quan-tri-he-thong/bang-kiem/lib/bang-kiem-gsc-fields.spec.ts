import { describe, expect, it } from "vitest";
import {
  parseBangKiemCachTinhDiem,
  parseBangKiemLoaiGiamSat,
  resolveBangKiemGscPersistFields,
} from "./bang-kiem-gsc-fields";

describe("bang-kiem-gsc-fields", () => {
  it("accepts GSC loại / cách tính codes", () => {
    expect(parseBangKiemLoaiGiamSat("nhat_ky_van_hanh")).toBe("NHAT_KY_VAN_HANH");
    expect(parseBangKiemCachTinhDiem("tron_goi")).toBe("TRON_GOI");
  });

  it("rejects unknown codes", () => {
    expect(parseBangKiemLoaiGiamSat("TRUC_TIEP")).toBeNull();
    expect(parseBangKiemCachTinhDiem("PERCENT")).toBeNull();
  });

  it("requires both fields before persist", () => {
    expect(resolveBangKiemGscPersistFields({}).ok).toBe(false);
    expect(
      resolveBangKiemGscPersistFields({ loai_giam_sat: "TUAN_THU" }).ok,
    ).toBe(false);
    expect(
      resolveBangKiemGscPersistFields({
        loai_giam_sat: "DANH_GIA_HE_THONG",
        cach_tinh_diem: "DAT_KHONG_DAT",
      }),
    ).toEqual({
      ok: true,
      loai_giam_sat: "DANH_GIA_HE_THONG",
      cach_tinh_diem: "DAT_KHONG_DAT",
    });
  });
});
