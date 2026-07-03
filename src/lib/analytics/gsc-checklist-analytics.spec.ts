import { describe, expect, it } from "vitest";
import {
  groupCriterionKhoaRows,
  pickTopInterventionChecklists,
  sortChecklistOverviewByRisk,
  sortCriterionMatrix,
} from "./gsc-checklist-analytics";
import type { GscChecklistOverviewRow } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

const row = (ma: string, tyLe: number, viPham: number): GscChecklistOverviewRow => ({
  ma_bk: ma,
  ten_bang_kiem: ma,
  tong_phien: 1,
  tong_quan_sat: 10,
  tong_dat: Math.round((tyLe / 100) * 10),
  tong_vi_pham: viPham,
  ty_le_tuan_thu: tyLe,
  worst_khoa_ten: null,
  worst_khoa_ty_le: null,
  top_violation_ten: null,
  top_violation_so: null,
});

describe("gsc-checklist-analytics", () => {
  it("sorts BK by compliance asc then violations desc", () => {
    const sorted = sortChecklistOverviewByRisk([row("B", 80, 1), row("A", 50, 5), row("C", 50, 2)]);
    expect(sorted.map((r) => r.ma_bk)).toEqual(["A", "C", "B"]);
  });

  it("pickTopInterventionChecklists respects limit", () => {
    const top = pickTopInterventionChecklists([row("A", 40, 3), row("B", 30, 8), row("C", 20, 1)], 2);
    expect(top).toHaveLength(2);
    expect(top[0].ma_bk).toBe("C");
  });

  it("sortCriterionMatrix puts weakest first", () => {
    const sorted = sortCriterionMatrix([
      { criterion_id: "a", ten_tieu_chi: "A", stt: 1, tong_quan_sat: 10, tong_dat: 9, tong_vi_pham: 1, ty_le_tuan_thu: 90 },
      { criterion_id: "b", ten_tieu_chi: "B", stt: 2, tong_quan_sat: 10, tong_dat: 5, tong_vi_pham: 5, ty_le_tuan_thu: 50 },
    ]);
    expect(sorted[0].criterion_id).toBe("b");
  });

  it("groupCriterionKhoaRows indexes by criterion", () => {
    const map = groupCriterionKhoaRows([
      { criterion_id: "c1", khoa_id: "k1", ten: "Nội", tong_quan_sat: 5, tong_vi_pham: 2, ty_le_vi_pham: 40 },
      { criterion_id: "c1", khoa_id: "k2", ten: "Ngoại", tong_quan_sat: 3, tong_vi_pham: 1, ty_le_vi_pham: 33.3 },
    ]);
    expect(map.get("c1")).toHaveLength(2);
  });
});
