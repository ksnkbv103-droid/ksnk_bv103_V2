import { describe, expect, it } from "vitest";
import type { GapKhoaRow } from "./supervision-matrix-mappers";
import {
  comparableGapRows,
  gapRowsWithLensData,
  maskGapRowsForLens,
  tyLeForLens,
} from "./supervision-source-lens";

function row(p: Partial<GapKhoaRow> & Pick<GapKhoaRow, "id" | "label">): GapKhoaRow {
  return {
    ten: p.ten ?? p.label,
    ty_le_tgs: p.ty_le_tgs ?? null,
    ty_le_ksnk: p.ty_le_ksnk ?? null,
    vol_tgs: p.vol_tgs ?? 0,
    vol_ksnk: p.vol_ksnk ?? 0,
    dat_tgs: p.dat_tgs ?? 0,
    dat_ksnk: p.dat_ksnk ?? 0,
    ...p,
  };
}

describe("supervision-source-lens", () => {
  const sample = [
    row({ id: "a", label: "A", ty_le_ksnk: 70, vol_ksnk: 40, dat_ksnk: 28, ty_le_tgs: 90, vol_tgs: 20, dat_tgs: 18 }),
    row({ id: "b", label: "B", ty_le_ksnk: null, vol_ksnk: 0, ty_le_tgs: 80, vol_tgs: 25, dat_tgs: 20 }),
  ];

  it("masks the other source to zero volume", () => {
    const ksnk = maskGapRowsForLens(sample, "ksnk");
    expect(ksnk[0]!.vol_tgs).toBe(0);
    expect(ksnk[0]!.ty_le_tgs).toBeNull();
    expect(ksnk[0]!.vol_ksnk).toBe(40);
    const tgs = maskGapRowsForLens(sample, "tgs");
    expect(tgs[1]!.vol_ksnk).toBe(0);
    expect(tgs[0]!.vol_tgs).toBe(20);
  });

  it("filters rows with lens data only", () => {
    expect(gapRowsWithLensData(sample, "ksnk").map((r) => r.id)).toEqual(["a"]);
    expect(gapRowsWithLensData(sample, "tgs").map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("comparable requires both volumes", () => {
    expect(comparableGapRows(sample).map((r) => r.id)).toEqual(["a"]);
  });

  it("tyLeForLens returns null without volume", () => {
    expect(tyLeForLens(sample[1]!, "ksnk")).toBeNull();
    expect(tyLeForLens(sample[1]!, "tgs")).toBe(80);
  });
});
