import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NKBV_BSI_CLASSIFICATIONS,
  NKBV_SSI_EVENT_CODES,
  NKBV_UTI_CLASSIFICATIONS,
  NKBV_VAE_CLASSIFICATIONS,
  isCautiClassification,
  isVapClassification,
  nkbvMajorTypeFromClassification,
} from "./nkbv-classification-taxonomy";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260809170000_nkbv_p0_rates_rpc_rls_index.sql",
);

describe("nkbvMajorTypeFromClassification", () => {
  it("ánh xạ đúng từng nhóm hội chứng", () => {
    for (const cls of NKBV_BSI_CLASSIFICATIONS) {
      expect(nkbvMajorTypeFromClassification(cls)).toBe("BSI");
    }
    for (const cls of NKBV_UTI_CLASSIFICATIONS) {
      expect(nkbvMajorTypeFromClassification(cls)).toBe("UTI");
    }
    for (const cls of NKBV_VAE_CLASSIFICATIONS) {
      expect(nkbvMajorTypeFromClassification(cls)).toBe("VAE");
    }
    for (const cls of NKBV_SSI_EVENT_CODES) {
      expect(nkbvMajorTypeFromClassification(cls)).toBe("SSI");
    }
    for (const cls of ["PNU1_VAP", "PNU2_HAP", "PNU3_VAP"]) {
      expect(nkbvMajorTypeFromClassification(cls)).toBe("PNEU");
    }
  });

  it("Organ/Space kèm mã vị trí vẫn là SSI", () => {
    expect(nkbvMajorTypeFromClassification("ORGAN_SPACE")).toBe("SSI");
    expect(nkbvMajorTypeFromClassification("ORGAN_SPACE:PJI")).toBe("SSI");
  });

  it("kết luận âm tính không vào tử số hội chứng nào", () => {
    const negatives = [
      "NO_EVENT",
      "NO_INFECTION",
      "INCOMPLETE",
      "INVALID_SITE",
      "EXPIRED",
      "PATOS",
      "ASB",
      "CONTAMINATION",
      "CANDIDA_EXCLUSION",
      "LOW_CFU",
      "COMMUNITY_INFECTION",
      "",
      null,
      undefined,
    ];
    for (const cls of negatives) {
      expect(nkbvMajorTypeFromClassification(cls)).toBe("OTHER");
    }
  });

  it("VAE không bị nhầm sang PNEU và ngược lại", () => {
    expect(nkbvMajorTypeFromClassification("PVAP")).toBe("VAE");
    expect(nkbvMajorTypeFromClassification("PNU1_VAP")).toBe("PNEU");
    expect(isVapClassification("PVAP")).toBe(false);
    expect(isVapClassification("PNU1_VAP")).toBe(true);
    expect(isVapClassification("PNU1_HAP")).toBe(false);
  });

  it("CAUTI tách khỏi UTI không liên quan sonde", () => {
    expect(isCautiClassification("CAUTI_SUTI")).toBe(true);
    expect(isCautiClassification("CAUTI_ABUTI")).toBe(true);
    expect(isCautiClassification("SUTI")).toBe(false);
    expect(isCautiClassification("ABUTI")).toBe(false);
  });
});

describe("đồng bộ với fn_nkbv_major_type_from_classification (SQL)", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("SQL liệt kê đúng danh sách classification của TS", () => {
    for (const cls of [
      ...NKBV_BSI_CLASSIFICATIONS,
      ...NKBV_UTI_CLASSIFICATIONS,
      ...NKBV_VAE_CLASSIFICATIONS,
      ...NKBV_SSI_EVENT_CODES,
    ]) {
      expect(sql).toContain(`'${cls}'`);
    }
  });

  it("SQL dùng cùng regex PNU cho nhánh viêm phổi", () => {
    expect(sql).toContain("^PNU[123]_(VAP|HAP)$");
  });

  it("RPC không còn đọc bảng đã bị xoá", () => {
    expect(sql).not.toMatch(/FROM\s+public\.fact_giam_sat_nkbv_ca/i);
    expect(sql).toContain("FROM public.nkbv_fact_su_kien");
  });
});
