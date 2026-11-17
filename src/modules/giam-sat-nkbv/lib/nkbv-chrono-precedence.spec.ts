import { describe, it, expect } from "vitest";
import { cdhaForBloodLast, validateBloodLast, validateChronoPrecedence } from "./nkbv-chrono-precedence";

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

describe("validateBloodLast", () => {
  const xn = [
    { id: "u1", ngay: "2026-03-05", benh_pham: "Nước tiểu", vi_khuan: "Escherichia coli" },
    { id: "b1", ngay: "2026-03-10", benh_pham: "Máu", vi_khuan: "Escherichia coli" },
    { id: "u2", ngay: "2026-04-20", benh_pham: "Nước tiểu", vi_khuan: "Klebsiella" },
  ];
  const call = (statusById: Record<string, string>, id = "b1", extra = xn) =>
    validateBloodLast({ targetId: id, targetDate: "2026-03-10", targetBenhPham: "Máu", xnList: extra, statusById });

  it("chặn máu khi còn mẫu cấy (+) khác trong 14 ngày chưa phân tích", () => {
    const r = call({});
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.earliestUnresolved.id).toBe("u1");
  });
  it("cho phép khi mẫu khác đã phân tích", () => {
    expect(call({ u1: "DA_PHAN_TICH" }).allowed).toBe(true);
  });
  it("bỏ qua mẫu ngoài 14 ngày và mẫu âm tính", () => {
    const list = [
      xn[1],
      xn[2],
      { id: "u3", ngay: "2026-03-08", benh_pham: "Nước tiểu", vi_khuan: "Âm tính" },
    ];
    expect(call({}, "b1", list).allowed).toBe(true);
  });
  it("không áp dụng cho mẫu không phải máu", () => {
    const r = validateBloodLast({ targetId: "u1", targetDate: "2026-03-05", targetBenhPham: "Nước tiểu", xnList: xn });
    expect(r.allowed).toBe(true);
  });
  describe("CĐHA", () => {
    const onlyBlood = [xn[1]];
    const callCdha = (cdhaList: Array<{ id: string; ngay: string; label?: string }>, statusById = {}) =>
      validateBloodLast({
        targetId: "b1",
        targetDate: "2026-03-10",
        targetBenhPham: "Máu",
        xnList: onlyBlood,
        cdhaList,
        statusById,
      });
    it("chặn máu khi còn CĐHA chưa xử lý trong ±14 ngày (trước hoặc sau)", () => {
      const before = callCdha([{ id: "c1", ngay: "2026-03-01", label: "XQ ngực" }]);
      expect(before.allowed).toBe(false);
      if (!before.allowed) expect(before.earliestUnresolved.kind).toBe("CDHA");
      expect(callCdha([{ id: "c2", ngay: "2026-03-20" }]).allowed).toBe(false);
    });
    it("cho phép khi CĐHA đã xử lý hoặc ngoài 14 ngày", () => {
      expect(callCdha([{ id: "c1", ngay: "2026-03-01" }], { c1: "BO_QUA" }).allowed).toBe(true);
      expect(callCdha([{ id: "c1", ngay: "2026-02-01" }]).allowed).toBe(true);
    });
  });
});

describe("cdhaForBloodLast — phim phổi bình thường", () => {
  it("coi imaging_chest_normal là đã xử lý, không chặn cấy máu", () => {
    const { cdhaList, statusById } = cdhaForBloodLast([
      { id: "c1", ngay: "2026-03-01", tieu_chuan_key: "imaging_chest_normal" },
      { id: "c2", ngay: "2026-03-02", tieu_chuan_key: "imaging_chest" },
    ]);
    expect(statusById).toEqual({ c1: "DA_XU_LY" });
    const r = validateBloodLast({
      targetId: "b1", targetDate: "2026-03-03", targetBenhPham: "Máu", xnList: [], cdhaList,
      statusById,
    });
    expect(r.allowed).toBe(false); // c2 (thâm nhiễm) vẫn chặn
    const r2 = validateBloodLast({
      targetId: "b1", targetDate: "2026-03-03", targetBenhPham: "Máu", xnList: [],
      cdhaList: cdhaList.filter((c) => c.id === "c1"), statusById,
    });
    expect(r2.allowed).toBe(true);
  });
});
