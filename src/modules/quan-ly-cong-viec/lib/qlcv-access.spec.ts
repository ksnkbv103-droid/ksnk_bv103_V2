import { describe, it, expect } from "vitest";
import {
  canShowDeleteTask,
  canShowEditTaskMetadata,
  canShowHoatDongProgressSection,
  canShowHuyKhiNghiemThuKhongDat,
  isQlcvTaskOverdue,
} from "./qlcv-access";

const baseFlags = {
  isRBACAdmin: false,
  hasDelete: false,
  hasEdit: true,
  hasCreate: true,
  hasApprove: false,
  actorStaffId: "actor-1",
};

describe("isQlcvTaskOverdue", () => {
  it("mã QUA_HAN → quá hạn (nhãn)", () => {
    expect(isQlcvTaskOverdue({ trang_thai: "QUA_HAN", phan_tram_hoan_thanh: 10 })).toBe(true);
  });
});

describe("canShowHoatDongProgressSection", () => {
  it("ẩn chờ nghiệm thu nếu không phải quản trị", () => {
    expect(
      canShowHoatDongProgressSection(
        { trang_thai: "CHO_DUYET", phan_tram_hoan_thanh: 100, is_active: true },
        baseFlags,
      ),
    ).toBe(false);
  });
  it("ẩn QUA_HAN @100% nếu không phải quản trị (cổng nghiệm thu)", () => {
    expect(
      canShowHoatDongProgressSection(
        { trang_thai: "QUA_HAN", phan_tram_hoan_thanh: 100, is_active: true },
        baseFlags,
      ),
    ).toBe(false);
  });
  it("quản trị vẫn thấy form khi chờ nghiệm thu", () => {
    expect(
      canShowHoatDongProgressSection(
        { trang_thai: "CHO_DUYET", phan_tram_hoan_thanh: 100, is_active: true },
        { ...baseFlags, isRBACAdmin: true },
      ),
    ).toBe(true);
  });
});

describe("canShowEditTaskMetadata", () => {
  it("có edit, không phải phụ trách — vẫn sửa metadata khi chờ nghiệm thu", () => {
    expect(
      canShowEditTaskMetadata(
        {
          trang_thai: "CHO_DUYET",
          phan_tram_hoan_thanh: 100,
          is_active: true,
          nguoi_phu_trach_id: "other",
        },
        baseFlags,
      ),
    ).toBe(true);
  });

  it("người phụ trách tự giao: được phép sửa metadata công việc", () => {
    expect(
      canShowEditTaskMetadata(
        {
          trang_thai: "DANG_LAM",
          phan_tram_hoan_thanh: 50,
          is_active: true,
          nguoi_phu_trach_id: "actor-1",
          nguoi_tao_id: "actor-1",
        },
        baseFlags,
      ),
    ).toBe(true);
  });

  it("đề xuất chờ duyệt — dùng form phê duyệt, không sửa qua CongViecForm", () => {
    expect(
      canShowEditTaskMetadata(
        {
          trang_thai: "MOI",
          is_active: false,
          nguoi_phu_trach_id: null,
        },
        baseFlags,
      ),
    ).toBe(false);
  });
});

describe("canShowHuyKhiNghiemThuKhongDat", () => {
  const choDuyet = { trang_thai: "CHO_DUYET", phan_tram_hoan_thanh: 100, is_active: true };

  it("ẩn khi có quyền duyệt nhưng không có quyền xóa", () => {
    expect(canShowHuyKhiNghiemThuKhongDat(choDuyet, { ...baseFlags, hasApprove: true })).toBe(false);
  });

  it("hiện khi có quyền xóa và đang chờ nghiệm thu", () => {
    expect(canShowHuyKhiNghiemThuKhongDat(choDuyet, { ...baseFlags, hasDelete: true })).toBe(true);
  });

  it("ẩn khi chưa vào cổng nghiệm thu", () => {
    expect(
      canShowHuyKhiNghiemThuKhongDat(
        { trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 40, is_active: true },
        { ...baseFlags, hasDelete: true },
      ),
    ).toBe(false);
  });

  it("ẩn khi chỉ duyệt — việc 100% quá hạn", () => {
    expect(
      canShowHuyKhiNghiemThuKhongDat(
        {
          trang_thai: "DANG_LAM",
          phan_tram_hoan_thanh: 100,
          han_hoan_thanh: "2020-01-01",
          is_active: true,
        },
        { ...baseFlags, hasApprove: true },
      ),
    ).toBe(false);
  });

  it("hiện khi có quyền xóa — từ chối + quá hạn 100%", () => {
    expect(
      canShowHuyKhiNghiemThuKhongDat(
        { trang_thai: "TU_CHOI", phan_tram_hoan_thanh: 100, is_qua_han: true, is_active: true },
        { ...baseFlags, hasDelete: true },
      ),
    ).toBe(true);
  });
});

describe("canShowDeleteTask", () => {
  it("không phải quản trị viên → không được xóa", () => {
    expect(
      canShowDeleteTask(
        {
          trang_thai: "DANG_LAM",
          nguoi_tao_id: "actor-1",
          han_hoan_thanh: "2020-01-01",
          is_active: true,
          nguoi_phu_trach_id: "other",
          phan_tram_hoan_thanh: 50,
        },
        baseFlags,
      ),
    ).toBe(false);
  });
  it("là quản trị viên → được xóa", () => {
    expect(
      canShowDeleteTask(
        {
          trang_thai: "DANG_LAM",
          han_hoan_thanh: "2020-01-01",
          is_active: true,
          nguoi_phu_trach_id: "other",
          phan_tram_hoan_thanh: 50,
        },
        { ...baseFlags, isRBACAdmin: true },
      ),
    ).toBe(true);
  });
  it("quyền DELETE (không admin) → được xóa", () => {
    expect(
      canShowDeleteTask(
        {
          trang_thai: "DANG_LAM",
          is_active: true,
          nguoi_phu_trach_id: "other",
          phan_tram_hoan_thanh: 50,
        },
        { ...baseFlags, hasDelete: true },
      ),
    ).toBe(true);
  });
});
