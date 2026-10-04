import { describe, expect, it } from "vitest";
import {
  HINH_THUC_CHUYEN_TRACH,
  HINH_THUC_GIAM_SAT_CHEO,
  HINH_THUC_TU_GIAM_SAT,
  deriveHinhThucGiamSat,
} from "./supervision-policy";

/** GSC-L01 / Domain 14 Lock A fixtures. */
describe("deriveHinhThucGiamSat (GSC-L01 Lock A)", () => {
  it("KSNK cùng khoa → luôn chuyên trách (≠ TGS)", () => {
    expect(
      deriveHinhThucGiamSat({ isKsnkDept: true, crossKhoa: false }),
    ).toBe(HINH_THUC_CHUYEN_TRACH);
  });

  it("KSNK khác khoa → chuyên trách", () => {
    expect(
      deriveHinhThucGiamSat({ isKsnkDept: true, crossKhoa: true }),
    ).toBe(HINH_THUC_CHUYEN_TRACH);
  });

  it("ML / NV cùng khoa (không KSNK) → TGS", () => {
    expect(
      deriveHinhThucGiamSat({ isKsnkDept: false, crossKhoa: false }),
    ).toBe(HINH_THUC_TU_GIAM_SAT);
  });

  it("khoa A → khoa B (không KSNK) → Chéo", () => {
    expect(
      deriveHinhThucGiamSat({ isKsnkDept: false, crossKhoa: true }),
    ).toBe(HINH_THUC_GIAM_SAT_CHEO);
  });
});
