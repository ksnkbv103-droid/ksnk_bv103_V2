import { describe, expect, it } from "vitest";
import {
  gscLichSuHref,
  gscThongKeHref,
  parseGscLoaiParam,
  resolveGscLoaiFromPathname,
} from "./gsc-app-paths";

describe("gsc-app-paths GSC-5", () => {
  it("maps form path to loai", () => {
    expect(resolveGscLoaiFromPathname("/giam-sat-chung/nhat-ky")).toBe("NHAT_KY_VAN_HANH");
    expect(resolveGscLoaiFromPathname("/giam-sat-chung/he-thong")).toBe("DANH_GIA_HE_THONG");
    expect(resolveGscLoaiFromPathname("/giam-sat-chung/tuan-thu")).toBe("TUAN_THU");
    expect(resolveGscLoaiFromPathname("/giam-sat-chung")).toBeUndefined();
  });

  it("carries loai on thống kê / lịch sử for nhật ký and hệ thống", () => {
    expect(gscThongKeHref("NHAT_KY_VAN_HANH")).toBe("/thong-ke/gsc?loai=NHAT_KY_VAN_HANH");
    expect(gscLichSuHref("NHAT_KY_VAN_HANH")).toBe("/lich-su/gsc?loai=NHAT_KY_VAN_HANH");
    expect(gscThongKeHref("DANH_GIA_HE_THONG")).toBe("/thong-ke/gsc?loai=DANH_GIA_HE_THONG");
    expect(gscThongKeHref("TUAN_THU")).toBe("/thong-ke/gsc");
    expect(gscLichSuHref("TUAN_THU")).toBe("/lich-su/gsc");
    expect(gscThongKeHref()).toBe("/thong-ke/gsc");
  });

  it("parses loai query", () => {
    expect(parseGscLoaiParam("nhat_ky_van_hanh")).toBe("NHAT_KY_VAN_HANH");
    expect(parseGscLoaiParam("bogus")).toBeUndefined();
  });
});
