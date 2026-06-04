import { describe, it, expect } from "vitest";
import {
  canShowDeleteTask,
  canShowEditTaskMetadata,
  canShowHoatDongProgressSection,
  isQlcvTaskInQuaHanLane,
} from "./qlcv-access";

const baseFlags = {
  isRBACAdmin: false,
  hasDelete: false,
  hasEdit: true,
  hasCreate: true,
  hasApprove: false,
  actorStaffId: "actor-1",
};

describe("isQlcvTaskInQuaHanLane", () => {
  it("mã QUA_HAN → lane quá hạn", () => {
    expect(isQlcvTaskInQuaHanLane({ trang_thai: "QUA_HAN", phan_tram_hoan_thanh: 10 })).toBe(true);
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
