import { describe, expect, it } from "vitest";
import { parseQlcvImportRow } from "./qlcv-import-parse";

describe("parseQlcvImportRow", () => {
  it("accepts valid row with Vietnamese headers", () => {
    const r = parseQlcvImportRow(
      {
        "Tiêu đề": "Kiểm tra phòng mổ",
        ma_nv: "NV001",
        ma_khoa: "KSNK",
        loai_cong_viec: "DOT_XUAT",
        han_hoan_thanh: "2026-12-31",
      },
      2,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.row.tieu_de).toBe("Kiểm tra phòng mổ");
      expect(r.row.ma_nv).toBe("NV001");
      expect(r.row.ma_khoa).toBe("KSNK");
    }
  });

  it("rejects missing assignee", () => {
    const r = parseQlcvImportRow({ tieu_de: "X" }, 3);
    expect(r.ok).toBe(false);
  });

  it("cho phép thiếu ma_khoa (địa điểm tùy chọn)", () => {
    const r = parseQlcvImportRow(
      { tieu_de: "X", ma_nv: "NV001", han_hoan_thanh: "2026-12-31", loai_cong_viec: "DOT_XUAT" },
      4,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.row.ma_khoa).toBeNull();
  });

  it("DOT thiếu hạn → lỗi dòng", () => {
    const r = parseQlcvImportRow(
      { tieu_de: "X", ma_nv: "NV001", loai_cong_viec: "DOT_XUAT" },
      5,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => /Hạn/i.test(e))).toBe(true);
  });

  it("cột loại DINH_KY → vẫn ghi DOT_XUAT (QLCV-05)", () => {
    const r = parseQlcvImportRow(
      {
        tieu_de: "X",
        ma_nv: "NV001",
        loai_cong_viec: "DINH_KY",
        han_hoan_thanh: "2026-12-31",
      },
      6,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.row.loai_cong_viec).toBe("DOT_XUAT");
  });

  it("chấp nhận đúng tiêu đề cột của file Excel mẫu (downloadTemplate) và ngày YYYY/MM/DD hoặc Excel serial", () => {
    const r = parseQlcvImportRow(
      {
        "Tiêu đề*": "Rà soát checklist IPC nội bộ KSNK",
        "Mô tả": "Theo quy trình KSNK BV103",
        "Ưu tiên (thap|trung_binh|cao)": "cao",
        "Hạn (yyyy-mm-dd)*": "2026/12/31",
        "Mã nv phụ trách*": "ADMIN01",
        "Mã khoa địa điểm": "KSNK",
        "Mã tổ": "TO01",
      },
      7,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.row).toEqual({
        tieu_de: "Rà soát checklist IPC nội bộ KSNK",
        mo_ta: "Theo quy trình KSNK BV103",
        loai_cong_viec: "DOT_XUAT",
        muc_do_uu_tien: "CAO",
        han_hoan_thanh: "2026-12-31",
        ma_nv: "ADMIN01",
        ma_khoa: "KSNK",
        ma_to: "TO01",
      });
    }
  });

  it("từ chối ngày không tồn tại trên lịch (2026-02-31)", () => {
    const r = parseQlcvImportRow(
      {
        tieu_de: "X",
        ma_nv: "NV001",
        han_hoan_thanh: "2026-02-31",
      },
      8,
    );
    expect(r.ok).toBe(false);
  });
});
