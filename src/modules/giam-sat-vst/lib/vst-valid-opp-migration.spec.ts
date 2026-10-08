import { describe, expect, it } from "vitest";
import { readMigrationSql } from "@/lib/testing/migration-file";

describe("fn_vst_is_valid_opportunity §2.1", () => {
  const sql = readMigrationSql("vst_valid_opp_moment_cap");

  it("siết trần chỉ định: tuân thủ ≤2, bỏ sót ≤1, đếm phân biệt", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.fn_vst_is_valid_opportunity");
    expect(sql).toContain("SELECT DISTINCT btrim");
    expect(sql).toMatch(/'Bỏ sót' THEN 1 ELSE 2 END/);
    expect(sql).toContain("Trước khi tiếp xúc người bệnh");
    expect(sql).toContain("Sau khi tiếp xúc xung quanh người bệnh");
    expect(sql).not.toContain("≥1 thời điểm thuộc 5 nhãn");
  });
});
