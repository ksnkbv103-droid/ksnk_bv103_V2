import { describe, it, expect, vi, afterEach } from "vitest";
import { getBoardLaneId, boardLaneToKanbanColumn } from "./qlcv-board-lanes";

describe("getBoardLaneId (§4.3 QLCV)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("DA_HUY luôn lane đã hủy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(
      getBoardLaneId({
        trang_thai: "DA_HUY",
        han_hoan_thanh: "2026-01-01",
      }),
    ).toBe("lane_da_huy");
  });

  it("HOAN_THANH tách khỏi quá hạn theo lịch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(
      getBoardLaneId({
        trang_thai: "HOAN_THANH",
        han_hoan_thanh: "2026-01-01",
      }),
    ).toBe("lane_hoan_thanh");
  });

  it("mã QUA_HAN → lane quá hạn", () => {
    expect(getBoardLaneId({ trang_thai: "QUA_HAN", phan_tram_hoan_thanh: 10 })).toBe("lane_qua_han");
  });

  it("is_qua_han ưu tiên trước chờ nghiệm thu", () => {
    expect(
      getBoardLaneId({
        trang_thai: "CHO_DUYET",
        is_qua_han: true,
        phan_tram_hoan_thanh: 100,
      }),
    ).toBe("lane_qua_han");
  });

  it("CHO_DUYET không cờ quá hạn → chờ duyệt", () => {
    expect(
      getBoardLaneId({
        trang_thai: "CHO_DUYET",
        is_qua_han: false,
        phan_tram_hoan_thanh: 100,
      }),
    ).toBe("lane_cho_duyet");
  });

  it("DANG_LAM 100% hạn tương lai → chờ duyệt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(
      getBoardLaneId({
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 100,
        han_hoan_thanh: "2026-12-31",
      }),
    ).toBe("lane_cho_duyet");
  });

  it("DANG_LAM 50% chưa quá hạn → đang làm", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(
      getBoardLaneId({
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 50,
        han_hoan_thanh: "2026-12-31",
      }),
    ).toBe("lane_dang_lam");
  });

  it("TU_CHOI → đang làm (làm lại)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(
      getBoardLaneId({
        trang_thai: "TU_CHOI",
        phan_tram_hoan_thanh: 90,
        han_hoan_thanh: "2026-12-31",
      }),
    ).toBe("lane_dang_lam");
  });

  it("hạn đã qua → quá hạn thay vì đang làm", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00Z"));
    expect(
      getBoardLaneId({
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 50,
        han_hoan_thanh: "2026-06-01",
      }),
    ).toBe("lane_qua_han");
  });

  it("đề xuất inactive MOI", () => {
    expect(
      getBoardLaneId({
        trang_thai: "MOI",
        is_active: false,
      }),
    ).toBe("lane_de_xuat");
  });

  it("MOI + active → đang làm (kể cả chưa có phụ trách — dữ liệu cũ)", () => {
    expect(
      getBoardLaneId({ trang_thai: "MOI", is_active: true, nguoi_phu_trach_id: null }),
    ).toBe("lane_dang_lam");
    expect(
      getBoardLaneId({ trang_thai: "MOI", is_active: true, nguoi_phu_trach_id: "00000000-0000-4000-8000-000000000001" }),
    ).toBe("lane_dang_lam");
  });
});

describe("boardLaneToKanbanColumn", () => {
  it("đề xuất → DE_XUAT hoặc DANG_LAM khi không có cột đề xuất", () => {
    expect(boardLaneToKanbanColumn("lane_de_xuat", false)).toBe("DANG_LAM");
    expect(boardLaneToKanbanColumn("lane_de_xuat", true)).toBe("DE_XUAT");
  });
});
