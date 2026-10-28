import { describe, expect, it } from "vitest";
import {
  isMyQlcvTask,
  isQlcvHomNayCuaToi,
  isQlcvChoToiDuyet,
  matchesQlcvBoardFilter,
} from "./qlcv-board-filter";

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

  it("GATE_CHO_TOI không còn global — cần actor ∈ PT∨PH∨giao", () => {
    const dexuat = { is_active: false, trang_thai: "MOI" };
    const choNt = { trang_thai: "CHO_DUYET", phan_tram_hoan_thanh: 100 };
    // no actor → 0
    expect(matchesQlcvBoardFilter(dexuat, "GATE_CHO_TOI")).toBe(false);
    expect(matchesQlcvBoardFilter(choNt, "GATE_CHO_TOI", { actorStaffId: null })).toBe(false);
    // DANG_LAM never cho_toi even if PT
    expect(
      matchesQlcvBoardFilter(
        { trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 40, nguoi_phu_trach_id: "me" },
        "GATE_CHO_TOI",
        { actorStaffId: "me" },
      ),
    ).toBe(false);
  });
});

describe("isQlcvChoToiDuyet Domain 24=A actor lens", () => {
  const choNt = {
    trang_thai: "CHO_DUYET",
    phan_tram_hoan_thanh: 100,
  };
  const dexuat = { is_active: false, trang_thai: "MOI" };

  it("user chỉ PH → thấy", () => {
    expect(
      isQlcvChoToiDuyet(
        { ...choNt, nguoi_phoi_hop_ids: ["ph-only", "other"] },
        "ph-only",
      ),
    ).toBe(true);
    expect(
      matchesQlcvBoardFilter(
        { ...dexuat, nguoi_phoi_hop_ids: ["ph-only"] },
        "GATE_CHO_TOI",
        { actorStaffId: "ph-only" },
      ),
    ).toBe(true);
  });

  it("user phụ trách → thấy", () => {
    expect(
      isQlcvChoToiDuyet({ ...choNt, nguoi_phu_trach_id: "pt-1" }, "pt-1"),
    ).toBe(true);
  });

  it("user người giao → thấy", () => {
    expect(
      isQlcvChoToiDuyet({ ...dexuat, nguoi_giao_viec_id: "giao-1" }, "giao-1"),
    ).toBe(true);
  });

  it("user ngoài ba vai → 0", () => {
    expect(
      isQlcvChoToiDuyet(
        {
          ...choNt,
          nguoi_phu_trach_id: "pt",
          nguoi_giao_viec_id: "giao",
          nguoi_phoi_hop_ids: ["ph"],
          nguoi_tao_id: "outsider",
        },
        "outsider",
      ),
    ).toBe(false);
  });

  it("không hiện open global không dính actor", () => {
    expect(isQlcvChoToiDuyet({ ...choNt }, "stranger")).toBe(false);
    expect(isQlcvChoToiDuyet({ ...dexuat }, "stranger")).toBe(false);
  });
});

describe("HOM_NAY (lịch VN)", () => {
  // 2026-10-28 00:30 VN = 2026-10-27T17:30Z
  const now = new Date("2026-10-27T17:30:00Z");
  const mine = { nguoi_phu_trach_id: "ns-01", trang_thai: "DANG_LAM" };

  it("hạn 00:00 VN hôm nay (lưu 17:00Z hôm trước) → khớp", () => {
    expect(isQlcvHomNayCuaToi({ ...mine, han_hoan_thanh: "2026-10-27T17:00:00Z" }, "ns-01", now)).toBe(true);
  });

  it("hạn ngày thuần hôm nay → khớp; hôm qua/mai → không", () => {
    expect(isQlcvHomNayCuaToi({ ...mine, han_hoan_thanh: "2026-10-28" }, "ns-01", now)).toBe(true);
    expect(isQlcvHomNayCuaToi({ ...mine, han_hoan_thanh: "2026-10-27" }, "ns-01", now)).toBe(false);
    expect(isQlcvHomNayCuaToi({ ...mine, han_hoan_thanh: "2026-10-29" }, "ns-01", now)).toBe(false);
  });

  it("loại việc đã đóng, của người khác, không hạn", () => {
    const han = "2026-10-28";
    expect(isQlcvHomNayCuaToi({ ...mine, trang_thai: "HOAN_THANH", han_hoan_thanh: han }, "ns-01", now)).toBe(false);
    expect(isQlcvHomNayCuaToi({ ...mine, nguoi_phu_trach_id: "ns-09", han_hoan_thanh: han }, "ns-01", now)).toBe(false);
    expect(isQlcvHomNayCuaToi({ ...mine, han_hoan_thanh: null }, "ns-01", now)).toBe(false);
  });
});
