import { describe, expect, it } from "vitest";
import {
  filterBangKiemByLopGiamSatMode,
  isGscRouteDeepLinkAllowed,
  isVstHubBangKiemExcludedFromGscGeneric,
  readLopGiamSatFromBangKiem,
} from "./gsc-lop-giam-sat-filter";

describe("gsc-lop-giam-sat-filter 25d residual", () => {
  const heThong = {
    ma_bk: "KSNK.QT.02.BM.04",
    loai_giam_sat: "TUAN_THU",
    ap_dung_jsonb: { seed_meta: { lop_giam_sat: "he_thong" } },
  };
  const thucHanh = {
    ma_bk: "KSNK.QT.01.BM.03",
    loai_giam_sat: "TUAN_THU",
    ap_dung_jsonb: { seed_meta: { lop_giam_sat: "thuc_hanh_don_vi" } },
  };
  const vstBm02 = {
    ma_bk: "KSNK.QT.07.BM.02",
    loai_giam_sat: "TUAN_THU",
    ap_dung_jsonb: { seed_meta: { lop_giam_sat: "thuc_hanh_don_vi" } },
  };
  const who = { ma_bk: "KSNK.QT.07.BM.01", loai_giam_sat: "TUAN_THU" };

  it("reads seed_meta.lop_giam_sat", () => {
    expect(readLopGiamSatFromBangKiem(heThong)).toBe("he_thong");
    expect(readLopGiamSatFromBangKiem(thucHanh)).toBe("thuc_hanh_don_vi");
  });

  it("TUAN_THU picker hides he_thong QT.02/05/QĐ.01 and VST hub", () => {
    const out = filterBangKiemByLopGiamSatMode(
      [heThong, thucHanh, vstBm02, who, { ma_bk: "KSNK.QĐ.01.BM.01", ap_dung_jsonb: { seed_meta: { lop_giam_sat: "he_thong" } } }],
      "TUAN_THU",
    );
    expect(out.map((r) => r.ma_bk)).toEqual(["KSNK.QT.01.BM.03"]);
  });

  it("DANH_GIA_HE_THONG picker only he_thong", () => {
    const out = filterBangKiemByLopGiamSatMode([heThong, thucHanh, vstBm02], "DANH_GIA_HE_THONG");
    expect(out.map((r) => r.ma_bk)).toEqual(["KSNK.QT.02.BM.04"]);
  });

  it("?bk= thực hành mở BM.02/03, không mở lớp hệ thống hay WHO", () => {
    expect(isGscRouteDeepLinkAllowed({ ma_bk: "BM.07.02" }, "TUAN_THU")).toBe(true);
    expect(isGscRouteDeepLinkAllowed({ ma_bk: "KSNK.QT.07.BM.03" }, "TUAN_THU")).toBe(true);
    expect(isGscRouteDeepLinkAllowed(heThong, "TUAN_THU")).toBe(false);
    expect(isGscRouteDeepLinkAllowed(who, "TUAN_THU")).toBe(false);
    expect(isGscRouteDeepLinkAllowed(thucHanh, "TUAN_THU")).toBe(true);
    expect(isGscRouteDeepLinkAllowed(heThong, "DANH_GIA_HE_THONG")).toBe(true);
    expect(isGscRouteDeepLinkAllowed({ ma_bk: "BM.07.02" }, "DANH_GIA_HE_THONG")).toBe(false);
    expect(isGscRouteDeepLinkAllowed(thucHanh, "DANH_GIA_HE_THONG")).toBe(false);
  });

  it("excludes VST hub BM.02/03 from GSC generic", () => {
    expect(isVstHubBangKiemExcludedFromGscGeneric("BM.07.02")).toBe(true);
    expect(isVstHubBangKiemExcludedFromGscGeneric("KSNK.QT.07.BM.03")).toBe(true);
    expect(isVstHubBangKiemExcludedFromGscGeneric("KSNK.QT.01.BM.03")).toBe(false);
  });

  it("GSC-08: TUAN_THU bỏ BK nhật ký (fallback không gán thuc_hanh)", () => {
    const nhatKy = { ma_bk: "BM.QĐ.08.01", loai_giam_sat: "NHAT_KY_VAN_HANH" };
    expect(filterBangKiemByLopGiamSatMode([nhatKy, thucHanh], "TUAN_THU").map((r) => r.ma_bk)).toEqual([
      "KSNK.QT.01.BM.03",
    ]);
    expect(filterBangKiemByLopGiamSatMode([nhatKy], "TUAN_THU")).toEqual([]);
    expect(filterBangKiemByLopGiamSatMode([nhatKy], "NHAT_KY_VAN_HANH").map((r) => r.ma_bk)).toEqual([
      "BM.QĐ.08.01",
    ]);
  });
});

