import { describe, expect, it } from "vitest";
import { getQlcvBaoHoanThanhMode } from "./qlcv-detail-actions";

const base = {
  trangThai: "DANG_LAM",
  isAssignee: true,
  usesChecklist: false,
  requireKetQuaAt100: false,
  blocked: false,
};

describe("getQlcvBaoHoanThanhMode", () => {
  it("nộp thẳng với việc thường của người phụ trách", () => {
    for (const trangThai of ["MOI", "DANG_LAM", "TU_CHOI", "QUA_HAN"]) {
      expect(getQlcvBaoHoanThanhMode({ ...base, trangThai })).toBe("submit");
    }
  });
  it("cuộn tới panel khi có checklist hoặc cần kết quả", () => {
    expect(getQlcvBaoHoanThanhMode({ ...base, usesChecklist: true })).toBe("scroll");
    expect(getQlcvBaoHoanThanhMode({ ...base, requireKetQuaAt100: true })).toBe("scroll");
  });
  it("ẩn khi không phải người phụ trách, bị chặn hoặc sai trạng thái", () => {
    expect(getQlcvBaoHoanThanhMode({ ...base, isAssignee: false })).toBe("none");
    expect(getQlcvBaoHoanThanhMode({ ...base, blocked: true })).toBe("none");
    for (const trangThai of ["CHO_DUYET", "HOAN_THANH", "DA_HUY"]) {
      expect(getQlcvBaoHoanThanhMode({ ...base, trangThai })).toBe("none");
    }
  });
});
