import { describe, expect, it } from "vitest";
import {
  groupBomLinesByLoai,
  mergeDuplicateBomLinePlan,
  planAddOntoExistingQty,
  pickKeepBomLine,
  type BomLineForMerge,
} from "./cssd-bom-line-merge";

const line = (partial: Partial<BomLineForMerge> & { id: string }): BomLineForMerge => ({
  loai_dung_cu_id: "loai-a",
  so_luong: 1,
  created_at: "2026-01-01T00:00:00Z",
  is_active: true,
  ...partial,
});

describe("cssd-bom-line-merge", () => {
  it("pickKeepBomLine prefers largest so_luong then oldest created", () => {
    const keep = pickKeepBomLine([
      line({ id: "small-old", so_luong: 2, created_at: "2025-01-01T00:00:00Z" }),
      line({ id: "big-new", so_luong: 5, created_at: "2026-06-01T00:00:00Z" }),
      line({ id: "big-old", so_luong: 5, created_at: "2025-06-01T00:00:00Z" }),
    ]);
    expect(keep.id).toBe("big-old");
  });

  it("groupBomLinesByLoai sums qty and lists dropIds; skips null loai", () => {
    const map = groupBomLinesByLoai([
      line({ id: "a1", loai_dung_cu_id: "L1", so_luong: 2, created_at: "2026-01-01T00:00:00Z" }),
      line({ id: "a2", loai_dung_cu_id: "L1", so_luong: 3, created_at: "2026-02-01T00:00:00Z" }),
      line({ id: "b1", loai_dung_cu_id: "L2", so_luong: 1 }),
      line({ id: "n1", loai_dung_cu_id: null, so_luong: 9 }),
      line({ id: "off", loai_dung_cu_id: "L1", so_luong: 99, is_active: false }),
    ]);
    expect(map.size).toBe(2);
    const g1 = map.get("L1")!;
    expect(g1.keepId).toBe("a2");
    expect(g1.totalQty).toBe(5);
    expect(g1.dropIds).toEqual(["a1"]);
    expect(map.get("L2")!.dropIds).toEqual([]);
    expect(map.get("L2")!.totalQty).toBe(1);
  });

  it("mergeDuplicateBomLinePlan only returns groups with duplicates; total = SUM", () => {
    const plan = mergeDuplicateBomLinePlan([
      line({ id: "x1", loai_dung_cu_id: "X", so_luong: 1, created_at: "2026-01-01T00:00:00Z" }),
      line({ id: "x2", loai_dung_cu_id: "X", so_luong: 4, created_at: "2026-03-01T00:00:00Z" }),
      line({ id: "x3", loai_dung_cu_id: "X", so_luong: 2, created_at: "2026-02-01T00:00:00Z" }),
      line({ id: "y1", loai_dung_cu_id: "Y", so_luong: 7 }),
    ]);
    expect(plan).toHaveLength(1);
    expect(plan[0]!.loaiId).toBe("X");
    expect(plan[0]!.keepId).toBe("x2");
    expect(plan[0]!.totalQty).toBe(7);
    expect(plan[0]!.dropIds.sort()).toEqual(["x1", "x3"]);
  });

  it("planAddOntoExistingQty adds for THEM_DONG / form create duplicate", () => {
    expect(planAddOntoExistingQty(3, 2)).toBe(5);
    expect(planAddOntoExistingQty(null, 4)).toBe(4);
    expect(planAddOntoExistingQty(0, 1)).toBe(1);
  });
});
