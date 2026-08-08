import { describe, expect, it } from "vitest";
import {
  buildBenhAnTemplateTsv,
  buildBenhAnUniqueKey,
  normalizeBenhAnDate,
  parseBenhAnImportText,
} from "./nkbv-benh-an-template";

describe("nkbv-benh-an-template", () => {
  it("normalizeBenhAnDate nhận ISO và DD/MM/YYYY", () => {
    expect(normalizeBenhAnDate("2026-08-01")).toBe("2026-08-01");
    expect(normalizeBenhAnDate("01/08/2026")).toBe("2026-08-01");
    expect(normalizeBenhAnDate("1-8-2026")).toBe("2026-08-01");
  });

  it("buildBenhAnUniqueKey chuẩn hoá hoa + trim", () => {
    expect(buildBenhAnUniqueKey({ ma_benh_an: " ba-1 ", ma_benh_nhan: "bn-9" })).toBe("BA-1|BN-9");
  });

  it("parse mẫu nội bộ TSV", () => {
    const tsv = buildBenhAnTemplateTsv();
    const res = parseBenhAnImportText(tsv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].ma_benh_an).toBe("BA-00123");
    expect(res.rows[1].ngay_vao_vien).toBe("2026-08-01");
  });

  it("parse alias tiếng Việt + bỏ trùng trong lô", () => {
    const text = [
      "Mã bệnh án\tMã bệnh nhân\tHọ và tên\tNgày vào viện\tKhoa",
      "BA-1\tBN-1\tNguyen A\t2026-07-01\tHSTC",
      "BA-1\tBN-1\tNguyen A\t2026-07-01\tHSTC",
      "BA-2\tBN-2\tTran B\t02/07/2026\tNGOAI",
    ].join("\n");
    const res = parseBenhAnImportText(text);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(2);
    expect(res.skippedBatchDup).toBe(1);
    expect(res.rows[1].ngay_vao_vien).toBe("2026-07-02");
  });

  it("báo lỗi thiếu cột bắt buộc", () => {
    const res = parseBenhAnImportText("ma_benh_nhan\tho_ten\nBN1\tA");
    expect(res.ok).toBe(false);
  });
});
