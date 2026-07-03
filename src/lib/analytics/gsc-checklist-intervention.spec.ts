import { describe, expect, it } from "vitest";
import type { GscChecklistOverviewRow } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import {
  resolveSortedChecklistOverview,
  resolveTopInterventionChecklists,
} from "./gsc-checklist-intervention";

const row = (ma: string, tyLe: number, vp: number): GscChecklistOverviewRow =>
  ({
    ma_bk: ma,
    ty_le_tuan_thu: tyLe,
    tong_vi_pham: vp,
  }) as GscChecklistOverviewRow;

describe("gsc-checklist-intervention", () => {
  it("resolveSortedChecklistOverview sorts by risk", () => {
    const sorted = resolveSortedChecklistOverview({
      checklist_overview: [row("B", 80, 1), row("A", 50, 5), row("C", 50, 2)],
    } as never);
    expect(sorted.map((r) => r.ma_bk)).toEqual(["A", "C", "B"]);
  });

  it("resolveTopInterventionChecklists respects limit", () => {
    const top = resolveTopInterventionChecklists(
      {
        checklist_overview: [row("A", 40, 3), row("B", 30, 8), row("C", 20, 1)],
      } as never,
      2,
    );
    expect(top).toHaveLength(2);
    expect(top[0].ma_bk).toBe("C");
  });
});
