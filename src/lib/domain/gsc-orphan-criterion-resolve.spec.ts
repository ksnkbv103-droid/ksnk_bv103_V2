import { describe, expect, it } from "vitest";
import {
  assertCriterionTotalsMatchBk,
  resolveCriterionIdForAgg,
  resolveCriterionLabel,
  type OrphanCriterionMapRow,
} from "./gsc-orphan-criterion-resolve";

const ORPHAN_ID = "b4ae98d5-68a7-47c8-967a-62673d72de64";
const NEW_ID = "11111111-2222-4333-8444-555555555555";

describe("gsc-orphan-criterion-resolve DoD", () => {
  const orphanMap = new Map<string, OrphanCriterionMapRow>([
    [
      ORPHAN_ID,
      {
        old_criterion_id: ORPHAN_ID,
        old_noi_dung: "Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng)",
        new_criterion_id: NEW_ID,
        match_confidence: "exact",
      },
    ],
    [
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      {
        old_criterion_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        old_noi_dung: "Tiêu chí cũ không còn tương ứng",
        new_criterion_id: null,
        match_confidence: "none",
      },
    ],
  ]);
  const live = new Map<string, string>([[NEW_ID, "TC01 Tháo trang sức (mẫu mới)"]]);

  it("phiên cũ criterion_id mồ côi vẫn ra đúng tên cũ khi chưa có live", () => {
    expect(resolveCriterionLabel(ORPHAN_ID, new Map(), orphanMap)).toBe(
      "Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng)",
    );
  });

  it("có map → agg theo new id; không map → giữ id cũ + tên cũ", () => {
    expect(resolveCriterionIdForAgg(ORPHAN_ID, orphanMap)).toBe(NEW_ID);
    expect(resolveCriterionIdForAgg("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", orphanMap)).toBe(
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    );
    expect(
      resolveCriterionLabel("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", live, orphanMap),
    ).toBe("Tiêu chí cũ không còn tương ứng");
  });

  it("Σ cấp tiêu chí (mapped + unmapped) = cấp BK", () => {
    expect(
      assertCriterionTotalsMatchBk({ bkQuanSat: 100, mappedQuanSat: 84, unmappedQuanSat: 16 }),
    ).toBe(true);
    expect(
      assertCriterionTotalsMatchBk({ bkQuanSat: 100, mappedQuanSat: 84, unmappedQuanSat: 15 }),
    ).toBe(false);
  });
});
