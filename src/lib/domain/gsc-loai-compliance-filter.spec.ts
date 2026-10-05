import { describe, expect, it } from "vitest";
import {
  computeComplianceFromSessionCounts,
  isLoaiInGscCompliancePercent,
} from "./gsc-loai-compliance-filter";

describe("gsc-loai-compliance-filter GSC-01", () => {
  it("nhật ký và hệ thống ngoài %", () => {
    expect(isLoaiInGscCompliancePercent("TUAN_THU")).toBe(true);
    expect(isLoaiInGscCompliancePercent(null)).toBe(true);
    expect(isLoaiInGscCompliancePercent("NHAT_KY_VAN_HANH")).toBe(false);
    expect(isLoaiInGscCompliancePercent("DANH_GIA_HE_THONG")).toBe(false);
  });

  it("fixture: TUAN_THU 80% + nhật ký không kéo mẫu", () => {
    const out = computeComplianceFromSessionCounts([
      { loai_giam_sat: "TUAN_THU", tong_dat: 8, tong_quan_sat: 10 },
      { loai_giam_sat: "NHAT_KY_VAN_HANH", tong_dat: 0, tong_quan_sat: 4 },
    ]);
    expect(out.ty_le).toBe(80);
    expect(out.tong_quan_sat).toBe(10);
  });
});
