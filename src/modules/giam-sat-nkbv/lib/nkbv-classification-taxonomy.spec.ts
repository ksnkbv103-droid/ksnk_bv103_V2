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
const PNEU_NON_VAP_PATCH = join(
  process.cwd(),
  "supabase/migrations/20260909120000_nkbv_pneu_non_vap_major_type.sql",
);
const CH17_SSI_PREFIX_PATCH = join(
  process.cwd(),
  "supabase/migrations/20260910070000_nkbv_ch17_ssi_prefix_major_type.sql",
);

describe("nkbvMajorTypeFromClassification", () => {
  it("nhãn lịch sử SUTI_2/LCBI_3 vẫn map major nếu gặp trong DB cũ", () => {
    expect(nkbvMajorTypeFromClassification("SUTI_2")).toBe("UTI");
    expect(nkbvMajorTypeFromClassification("CAUTI_SUTI_2")).toBe("UTI");
    expect(nkbvMajorTypeFromClassification("LCBI_3")).toBe("BSI");
  });

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
    for (const cls of ["PNU1_VAP", "PNU2_HAP", "PNU3_VAP", "PNU1_NON_VAP"]) {
      expect(nkbvMajorTypeFromClassification(cls)).toBe("PNEU");
    }
  });

  it("Organ/Space kèm mã vị trí vẫn là SSI", () => {
    expect(nkbvMajorTypeFromClassification("ORGAN_SPACE")).toBe("SSI");
    expect(nkbvMajorTypeFromClassification("ORGAN_SPACE:PJI")).toBe("SSI");
  });

  it("CH17:* và SSI:* từ evaluateCh17 vào đúng major", () => {
    expect(nkbvMajorTypeFromClassification("CH17:IAB")).toBe("CH17");
    expect(nkbvMajorTypeFromClassification("CH17:USI")).toBe("CH17");
    expect(nkbvMajorTypeFromClassification("CH17:MEN")).toBe("CH17");
    expect(nkbvMajorTypeFromClassification("SSI:PJI")).toBe("SSI");
    expect(nkbvMajorTypeFromClassification("ssi:bone")).toBe("SSI");
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
      "RULED_OUT",
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

  it("SQL latest nhận CH17:* và SSI:*", () => {
    const patch = readFileSync(CH17_SSI_PREFIX_PATCH, "utf8");
    expect(patch).toContain("LIKE 'CH17:%'");
    expect(patch).toContain("LIKE 'SSI:%'");
  });

  it("SQL dùng cùng regex PNU cho nhánh viêm phổi", () => {
    const patch = readFileSync(PNEU_NON_VAP_PATCH, "utf8");
    expect(patch).toContain("^PNU[123]_(VAP|HAP|NON_VAP)$");
    expect(sql).toContain("^PNU[123]_(VAP|HAP)$");
  });

  it("RPC không còn đọc bảng đã bị xoá", () => {
    expect(sql).not.toMatch(/FROM\s+public\.fact_giam_sat_nkbv_ca/i);
    expect(sql).toContain("FROM public.nkbv_fact_su_kien");
  });
});
