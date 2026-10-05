import { describe, expect, it } from "vitest";
import { resolveGscFormHref, SUPERVISION_HISTORY_PATHS } from "./supervision-form-nav";

describe("supervision-form-nav", () => {
  it("resolveGscFormHref maps sub-routes", () => {
    expect(resolveGscFormHref("/giam-sat-chung/tuan-thu")).toBe("/giam-sat-chung/tuan-thu");
    expect(resolveGscFormHref("/giam-sat-chung/nhat-ky/thong-ke")).toBe("/giam-sat-chung/nhat-ky");
    expect(resolveGscFormHref("/giam-sat-chung/he-thong")).toBe("/giam-sat-chung/he-thong");
  });

  it("resolveGscFormHref from lịch sử/thống kê reads loai (default tuân thủ)", () => {
    expect(resolveGscFormHref("/lich-su/gsc")).toBe("/giam-sat-chung/tuan-thu");
    expect(resolveGscFormHref("/lich-su/gsc", "DANH_GIA_HE_THONG")).toBe("/giam-sat-chung/he-thong");
    expect(resolveGscFormHref("/lich-su/gsc", "NHAT_KY_VAN_HANH")).toBe("/giam-sat-chung/nhat-ky");
    expect(resolveGscFormHref("/thong-ke/gsc", "TUAN_THU")).toBe("/giam-sat-chung/tuan-thu");
  });

  it("canonical history paths", () => {
    expect(SUPERVISION_HISTORY_PATHS.vst).toBe("/lich-su/vst");
    expect(SUPERVISION_HISTORY_PATHS.gsc).toBe("/lich-su/gsc");
  });
});
