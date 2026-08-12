import { describe, expect, it } from "vitest";
import {
  filterPanelAnalysisColumns,
  splitBaAnalysisColumns,
} from "./nkbv-ba-master-columns";
import type { BaDayGridColumnDef } from "../components/NkbvBaDayGrid";

const col = (id: string): BaDayGridColumnDef => ({
  id,
  header: id,
  minWidth: 40,
  render: () => null,
});

describe("nkbv-ba-master-columns", () => {
  it("split: Index…SBAP trước; Kết luận + GC sau", () => {
    const { windowColumns, tailColumns } = splitBaAnalysisColumns([
      col("ax_index"),
      col("ax_ls"),
      col("ax_rit"),
      col("ax_sbap"),
      col("ax_ket_luan"),
      col("ax_ghi_chu"),
    ]);
    expect(windowColumns.map((c) => c.id)).toEqual([
      "ax_index",
      "ax_ls",
      "ax_rit",
      "ax_sbap",
    ]);
    expect(tailColumns.map((c) => c.id)).toEqual(["ax_ket_luan", "ax_ghi_chu"]);
  });

  it("filterPanelAnalysisColumns bỏ master_ket_luan / ax_can_thiep", () => {
    const filtered = filterPanelAnalysisColumns(
      [col("ax_index"), col("ax_ket_luan"), col("master_ket_luan"), col("ax_can_thiep")],
      "BSI",
    );
    expect(filtered.map((c) => c.id)).toEqual(["ax_index", "ax_ket_luan"]);
  });
});
