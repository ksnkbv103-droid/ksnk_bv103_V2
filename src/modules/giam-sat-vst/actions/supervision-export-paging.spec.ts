import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function exportFn(rel: string, marker: string): string {
  const src = readFileSync(resolve(process.cwd(), rel), "utf8");
  const start = src.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  return src.slice(start);
}

describe("Excel VST/GSC không cắt im", () => {
  it("phiên và cơ hội VST đọc hết trang trong kỳ", () => {
    const fn = exportFn(
      "src/modules/giam-sat-vst/actions/vst-export.actions.ts",
      "export async function exportVstOpportunitiesRaw",
    );
    expect(fn).toContain("fetchAllRangeRows");
    expect(fn).toContain("fetchAllByIdChunks");
    expect(fn).toContain('.gte("ngay_giam_sat", params.tu_ngay)');
    expect(fn).toContain('.lte("ngay_giam_sat", params.den_ngay)');
    expect(fn).toContain(".range(");
    expect(fn).not.toContain(".limit(");
    expect(fn).toContain("co_deo_gang");
    expect(fn).toContain("ten_nhan_vien");
    expect(fn).toContain("hinh_thuc_giam_sat");
    expect(fn).toContain("vi_tri");
    expect(fn).toContain("thoi_gian_bat_dau");
    expect(fn).toContain("success: false");
  });

  it("phiên GSC đọc hết trang; lỗi metadata không xuất file thiếu", () => {
    const fn = exportFn(
      "src/modules/giam-sat-chung/actions/gsc-export.actions.ts",
      "export async function exportGscSessionsRaw",
    );
    expect(fn).toContain("fetchAllRangeRows");
    expect(fn).toContain('.gte("ngay_giam_sat", params.tu_ngay)');
    expect(fn).toContain('.lte("ngay_giam_sat", params.den_ngay)');
    expect(fn).toContain(".range(");
    expect(fn).not.toContain(".limit(");
    expect(fn).toContain("if (metaErr) throw metaErr");
    expect(fn).toContain("success: false");
  });
});
