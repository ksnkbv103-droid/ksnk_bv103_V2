import { describe, expect, it } from "vitest";
import {
  validateSixSessionDimensions,
  validateVstObservationNhanVien,
} from "./giam-sat-session-dimensions";

const base = {
  khoa_id: "11111111-1111-4111-8111-111111111111",
  khu_vuc_id: "22222222-2222-4222-8222-222222222222",
  vi_tri: "Buồng 1",
  doi_tuong_loai: "NHAN_VIEN" as const,
  gan_nb: false,
};

describe("validateSixSessionDimensions (GS-01)", () => {
  it("reject thiếu khu vực / vị trí trắng / gan_nb", () => {
    expect(validateSixSessionDimensions({ ...base, khu_vuc_id: "" })).toMatch(/Khu vực/);
    expect(validateSixSessionDimensions({ ...base, vi_tri: "  " })).toMatch(/Vị trí/);
    expect(validateSixSessionDimensions({ ...base, gan_nb: null })).toMatch(/gan_nb/);
  });

  it("NHAN_VIEN: reject khi không có NV và không Ngoài danh mục", () => {
    expect(validateSixSessionDimensions({ ...base })).toMatch(/nhân viên|Ngoài danh mục/i);
  });

  it("NHAN_VIEN: accept MDM hoặc Ngoài danh mục + tên", () => {
    expect(
      validateSixSessionDimensions({
        ...base,
        nhan_vien_id: "33333333-3333-4333-8333-333333333333",
      }),
    ).toBeNull();
    expect(
      validateSixSessionDimensions({
        ...base,
        is_manual_nhan_vien: true,
        ten_manual_nhan_vien: "Nguyễn A",
      }),
    ).toBeNull();
    expect(
      validateSixSessionDimensions({
        ...base,
        ten_nhan_vien_ngoai: "Trần B",
      }),
    ).toBeNull();
  });

  it("loại ≠ NHAN_VIEN: không bắt buộc tên NV (N-GS-2)", () => {
    expect(
      validateSixSessionDimensions({
        ...base,
        doi_tuong_loai: "MOI_TRUONG",
      }),
    ).toBeNull();
  });
});

describe("validateVstObservationNhanVien", () => {
  it("reject khi thiếu cả id và tên ngoài", () => {
    expect(validateVstObservationNhanVien({})).toMatch(/nhân viên|ngoài danh mục/i);
  });

  it("accept MDM hoặc tên ngoài", () => {
    expect(
      validateVstObservationNhanVien({ nhan_vien_id: "33333333-3333-4333-8333-333333333333" }),
    ).toBeNull();
    expect(validateVstObservationNhanVien({ ten_nhan_vien_ngoai: "Lê C" })).toBeNull();
  });
});
