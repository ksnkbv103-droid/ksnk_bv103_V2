import { describe, expect, it } from "vitest";
import { isMyQlcvTask, matchesQlcvBoardFilter } from "./qlcv-board-filter";

describe("isMyQlcvTask", () => {
  it("matches assignee", () => {
    expect(
      isMyQlcvTask({ nguoi_phu_trach_id: "ns-01" }, "ns-01"),
    ).toBe(true);
  });

  it("matches own pending proposal", () => {
    expect(
      isMyQlcvTask(
        { is_active: false, trang_thai: "MOI", nguoi_tao_id: "ns-02" },
        "ns-02",
      ),
    ).toBe(true);
  });

  it("rejects without actor", () => {
    expect(isMyQlcvTask({ nguoi_phu_trach_id: "ns-01" }, null)).toBe(false);
  });

  it("excludes closed tasks", () => {
    expect(
      isMyQlcvTask({ nguoi_phu_trach_id: "ns-01", trang_thai: "HOAN_THANH" }, "ns-01"),
    ).toBe(false);
  });
});

describe("matchesQlcvBoardFilter MY_TASKS", () => {
  it("filters by actor context", () => {
    const rows = [
      { id: "1", nguoi_phu_trach_id: "ns-a" },
      { id: "2", nguoi_phu_trach_id: "ns-b" },
    ];
    const mine = rows.filter((r) =>
      matchesQlcvBoardFilter(r, "MY_TASKS", { actorStaffId: "ns-a" }),
    );
    expect(mine).toHaveLength(1);
    expect(mine[0]?.id).toBe("1");
  });
});

describe("matchesQlcvBoardFilter OVERDUE / GATE_CHO_TOI", () => {
  it("OVERDUE chỉ việc mở đã quá hạn", () => {
    expect(
      matchesQlcvBoardFilter({ trang_thai: "DANG_LAM", is_qua_han: true }, "OVERDUE"),
    ).toBe(true);
    expect(
      matchesQlcvBoardFilter({ trang_thai: "HOAN_THANH", is_qua_han: true }, "OVERDUE"),
    ).toBe(false);
  });

  it("GATE_CHO_TOI gồm đề xuất và chờ nghiệm thu", () => {
    expect(
      matchesQlcvBoardFilter({ is_active: false, trang_thai: "MOI" }, "GATE_CHO_TOI"),
    ).toBe(true);
    expect(
      matchesQlcvBoardFilter({ trang_thai: "CHO_DUYET", phan_tram_hoan_thanh: 100 }, "GATE_CHO_TOI"),
    ).toBe(true);
    expect(
      matchesQlcvBoardFilter({ trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 40 }, "GATE_CHO_TOI"),
    ).toBe(false);
  });
});
