import { describe, expect, it } from "vitest";
import { trangThaiCongViecSauBaoCaoTienDo } from "./qlcv-trang-thai-after-bao-cao-tien-do";

describe("trangThaiCongViecSauBaoCaoTienDo", () => {
  it("định kỳ 100% → HOAN_THANH", () => {
    expect(trangThaiCongViecSauBaoCaoTienDo(100, "DANG_LAM", "DINH_KY")).toBe("HOAN_THANH");
  });

  it("đột xuất 100% → CHO_DUYET", () => {
    expect(trangThaiCongViecSauBaoCaoTienDo(100, "DANG_LAM", "DOT_XUAT")).toBe("CHO_DUYET");
    expect(trangThaiCongViecSauBaoCaoTienDo(100, "DANG_LAM", "KHAN_CAP")).toBe("CHO_DUYET");
    expect(trangThaiCongViecSauBaoCaoTienDo(100, "DANG_LAM")).toBe("CHO_DUYET");
  });

  it("dưới 100% → DANG_LAM", () => {
    expect(trangThaiCongViecSauBaoCaoTienDo(40, "MOI", "DINH_KY")).toBe("DANG_LAM");
  });
});
