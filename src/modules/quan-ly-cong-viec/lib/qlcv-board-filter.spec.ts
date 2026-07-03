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
