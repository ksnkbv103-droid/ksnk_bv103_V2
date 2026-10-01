import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CSSD_ACTIVE_PAGE_SIZE } from "./cssd-active-page";
import { cssdTiepNhanWaitingItems, type TiepNhanCatalogRow } from "./cssd-tiep-nhan-waiting";

function row(id: string, seq: number): TiepNhanCatalogRow {
  return { id, ma_bo: `B01.SET.${String(seq).padStart(2, "0")}`, ten_bo: `Bo ${seq}`, updated_at: "2026-10-01T00:00:00.000Z" };
}

describe("cssdTiepNhanWaitingItems", () => {
  it("giữ bộ chỉ có ở trang sau và loại bộ có chu kỳ ở trang sau", () => {
    const page = CSSD_ACTIVE_PAGE_SIZE;
    const catalog: TiepNhanCatalogRow[] = [];
    const activeOnPage2 = `bo-${page}`;
    const waitingOnPage2 = `bo-${page + 1}`;
    for (let i = 0; i < page + 2; i += 1) catalog.push(row(`bo-${i}`, i + 1));
    catalog.push({ id: "legacy", ma_bo: "BV103-DC-ABCD", ten_bo: "Cũ", updated_at: "2026-10-01T00:00:00.000Z" });

    const activeBoIds = new Set<string>([activeOnPage2]);
    const ids = cssdTiepNhanWaitingItems(activeBoIds, catalog).map((item) => item.id);

    expect(ids).toContain(waitingOnPage2);
    expect(ids).not.toContain(activeOnPage2);
    expect(ids).not.toContain("legacy");
    expect(ids).toHaveLength(page + 1);
  });
});

describe("hàng chờ Tiếp nhận không cắt im", () => {
  it("danh mục và chu kỳ có trạm đọc hết trang; lỗi ném, không trả mảng cắt", () => {
    const src = readFileSync(resolve(process.cwd(), "src/modules/cssd-erp/actions/cssd-read.actions.ts"), "utf8");
    const start = src.indexOf('if (station === "TIEP_NHAN")');
    const end = src.indexOf("const PREV_STATION_COLS");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start, end);
    expect(fn).toContain("fetchAllActiveRows");
    expect(fn.match(/fetchAllActiveRows/g)?.length).toBe(2);
    expect(fn).toContain('.from("cssd_fact_quy_trinh")');
    expect(fn).toContain('.from("cssd_dm_bo_dung_cu")');
    expect(fn).toContain('.eq("is_active", true)');
    expect(fn).toContain('.not("tram_hien_tai_id", "is", null)');
    expect(fn).toContain('.order("id", { ascending: true })');
    expect(fn).toContain(".range(");
    expect(fn).not.toContain(".limit(");
    expect(fn).toContain("throw new Error");
    expect(fn).toContain("cssdTiepNhanWaitingItems");
  });
});
