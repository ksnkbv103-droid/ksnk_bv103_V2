import { describe, it, expect } from "vitest";
import { validateChronoPrecedence } from "./nkbv-chrono-precedence";

describe("validateChronoPrecedence", () => {
  const xnList = [
    {
      id: "xn-1",
      ngay: "2026-03-02",
      benh_pham: "Nước tiểu",
      vi_khuan: "Escherichia coli",
    },
    {
      id: "xn-2",
      ngay: "2026-03-06",
      benh_pham: "Nước tiểu",
      vi_khuan: "Klebsiella pneumoniae",
    },
    {
      id: "xn-3",
      ngay: "2026-03-10",
      benh_pham: "Máu",
      vi_khuan: "Pseudomonas aeruginosa",
    },
  ];

  it("cho phép phân tích xét nghiệm sớm nhất (không có mẫu nào trước đó)", () => {
    const statusById = {
      "xn-1": "CHUA_PHAN_TICH",
      "xn-2": "CHUA_PHAN_TICH",
      "xn-3": "CHUA_PHAN_TICH",
    };

    const res = validateChronoPrecedence({
      targetDate: "2026-03-02",
      targetId: "xn-1",
      xnList,
      statusById,
    });

    expect(res.allowed).toBe(true);
  });

  it("chặn nhảy cóc khi mẫu ngày 02/03 chưa phân tích nhưng cố mở mẫu ngày 06/03", () => {
    const statusById = {
      "xn-1": "CHUA_PHAN_TICH",
      "xn-2": "CHUA_PHAN_TICH",
      "xn-3": "CHUA_PHAN_TICH",
    };

    const res = validateChronoPrecedence({
      targetDate: "2026-03-06",
      targetId: "xn-2",
      xnList,
      statusById,
    });

    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.earliestUnresolved.id).toBe("xn-1");
      expect(res.earliestUnresolved.date).toBe("2026-03-02");
      expect(res.message).toContain("02/03/2026");
      expect(res.message).toContain("Escherichia coli");
      expect(res.message).toContain("Không thể nhảy cóc");
    }
  });

  it("cho phép phân tích mẫu 06/03 khi mẫu 02/03 đã được xử lý (DA_PHAN_TICH hoặc KHONG_DU_TC hoặc BO_QUA)", () => {
    const statusByIdAnalyzed = {
      "xn-1": "DA_PHAN_TICH",
      "xn-2": "CHUA_PHAN_TICH",
      "xn-3": "CHUA_PHAN_TICH",
    };

    const res1 = validateChronoPrecedence({
      targetDate: "2026-03-06",
      targetId: "xn-2",
      xnList,
      statusById: statusByIdAnalyzed,
    });
    expect(res1.allowed).toBe(true);

    const statusByIdExcluded = {
      "xn-1": "KHONG_DU_TC",
      "xn-2": "CHUA_PHAN_TICH",
      "xn-3": "CHUA_PHAN_TICH",
    };
    const res2 = validateChronoPrecedence({
      targetDate: "2026-03-06",
      targetId: "xn-2",
      xnList,
      statusById: statusByIdExcluded,
    });
    expect(res2.allowed).toBe(true);

    const statusByIdSkipped = {
      "xn-1": "BO_QUA",
      "xn-2": "CHUA_PHAN_TICH",
      "xn-3": "CHUA_PHAN_TICH",
    };
    const res3 = validateChronoPrecedence({
      targetDate: "2026-03-06",
      targetId: "xn-2",
      xnList,
      statusById: statusByIdSkipped,
    });
    expect(res3.allowed).toBe(true);
  });

  it("chỉ đích danh mẫu sớm nhất chưa xử lý khi có nhiều mẫu trước đó", () => {
    const statusById = {
      "xn-1": "CHUA_PHAN_TICH",
      "xn-2": "CHUA_PHAN_TICH",
      "xn-3": "CHUA_PHAN_TICH",
    };

    const res = validateChronoPrecedence({
      targetDate: "2026-03-10",
      targetId: "xn-3",
      xnList,
      statusById,
    });

    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.earliestUnresolved.id).toBe("xn-1"); // 02/03 sớm hơn 06/03
    }
  });

  it("cho phép phân tích 2 mẫu cùng ngày mà không bị coi là nhảy cóc", () => {
    const sameDayList = [
      { id: "xn-a", ngay: "2026-03-05", benh_pham: "Máu 1", vi_khuan: "S. aureus" },
      { id: "xn-b", ngay: "2026-03-05", benh_pham: "Máu 2", vi_khuan: "S. aureus" },
    ];
    const statusById = {
      "xn-a": "CHUA_PHAN_TICH",
      "xn-b": "CHUA_PHAN_TICH",
    };

    const res = validateChronoPrecedence({
      targetDate: "2026-03-05",
      targetId: "xn-b",
      xnList: sameDayList,
      statusById,
    });
    expect(res.allowed).toBe(true);
  });

  it("ngay null/undefined không ném lỗi và bị bỏ qua", () => {
    const res = validateChronoPrecedence({
      targetDate: "2026-03-05",
      targetId: "xn-b",
      xnList: [
        { id: "xn-a", ngay: null },
        { id: "xn-c", ngay: undefined },
        { id: "xn-d", ngay: "" },
      ],
    });
    expect(res.allowed).toBe(true);
  });
});
