import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  blockDeactivateForActiveCycles,
  countActiveCirculationCycles,
  cssdBoImportDeactivateIds,
  isActiveCirculationCycle,
} from "./cssd-bo-active-cycle";

describe("cssd-bo-active-cycle", () => {
  it("chặn chu kỳ hiệu lực khác MAT, kể cả tinh_trang null", () => {
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: "BINH_THUONG" })).toBe(true);
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: null })).toBe(true);
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: "HONG" })).toBe(true);
  });

  it("không chặn MAT hoặc chu kỳ đã tắt", () => {
    expect(isActiveCirculationCycle({ is_active: true, tinh_trang: "MAT" })).toBe(false);
    expect(isActiveCirculationCycle({ is_active: false, tinh_trang: "BINH_THUONG" })).toBe(false);
    expect(isActiveCirculationCycle({ is_active: null, tinh_trang: "BINH_THUONG" })).toBe(false);
  });

  it("đếm và chỉ chặn khi còn ít nhất một chu kỳ", () => {
    const rows = [
      { is_active: true, tinh_trang: "MAT" },
      { is_active: false, tinh_trang: "BINH_THUONG" },
      { is_active: true, tinh_trang: "BINH_THUONG" },
      { is_active: true, tinh_trang: null },
    ];
    expect(countActiveCirculationCycles(rows)).toBe(2);
    expect(blockDeactivateForActiveCycles(0)).toBeNull();
    expect(blockDeactivateForActiveCycles(2)).toMatch(/còn 2 chu kỳ/);
  });

  it("import chỉ gom id bộ đã có sẽ bị tắt, kể cả mã thiếu khi đồng bộ đầy đủ", () => {
    const existing = new Map([
      ["B01.SET.01", "id-1"],
      ["B01.SET.02", "id-2"],
    ]);
    expect(
      cssdBoImportDeactivateIds({
        existingCodeToId: existing,
        rows: [
          { code: "B01.SET.01", isActive: false },
          { code: "B01.SET.99", isActive: false },
        ],
        softDeleteMissing: false,
      }),
    ).toEqual(["id-1"]);
    expect(
      cssdBoImportDeactivateIds({
        existingCodeToId: existing,
        rows: [{ code: "B01.SET.01", isActive: true }],
        softDeleteMissing: true,
      }),
    ).toEqual(["id-2"]);
  });
});

describe("smart import bộ không tắt khi còn chu kỳ", () => {
  it("chặn trước upsert, cùng câu đếm lưu hành với form", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/modules/quan-tri-he-thong/danh-muc/actions/smart-import.actions.ts"),
      "utf8",
    );
    const start = src.indexOf("export async function smartImportData");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start);
    const guard = fn.indexOf("blockCssdBoImportIfCirculating");
    const upsert = fn.indexOf(".upsert(");
    expect(guard).toBeGreaterThan(-1);
    expect(upsert).toBeGreaterThan(guard);
    expect(fn).toContain('config.tableName === "cssd_dm_bo_dung_cu"');
    expect(fn).toContain("cssdBoImportDeactivateIds");
    expect(src).toContain("blockDeactivateForActiveCycles");
    expect(src).toContain("CSSD_ACTIVE_CIRCULATION_TINH_TRANG_OR");
    expect(src).toContain('.from("cssd_fact_quy_trinh")');
  });
});
