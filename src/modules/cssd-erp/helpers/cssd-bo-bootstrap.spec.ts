import { describe, expect, it, vi } from "vitest";
import { assertUnifiedBoMaFromRow } from "../shared/application/cssd-bo-bootstrap";

describe("assertUnifiedBoMaFromRow", () => {
  it("accepts unified ma_bo", () => {
    expect(assertUnifiedBoMaFromRow({ ma_bo: "B01.SET.01" })).toBe("B01.SET.01");
  });

  it("rejects missing ma_bo", () => {
    expect(() => assertUnifiedBoMaFromRow({ ma_bo: null })).toThrow(/chưa có mã bộ/);
  });

  it("rejects hex-like legacy ma_bo", () => {
    expect(() => assertUnifiedBoMaFromRow({ ma_bo: "BV103-DC-ABC123" })).toThrow(/chưa đúng chuẩn/);
  });

  it("rejects DM uuid display pattern", () => {
    expect(() =>
      assertUnifiedBoMaFromRow({ ma_bo: "DM-C751E9DB-C1EF-49FF-B041-3C123CD5F40F" }),
    ).toThrow(/chưa đúng chuẩn/);
  });
});

describe("bootstrapCssdQuyTrinhFromMaBo message", () => {
  it("distinguishes bo vs chi tiết in error copy", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        })),
      })),
    };
    const { bootstrapCssdQuyTrinhFromMaBo } = await import("../shared/application/cssd-bo-bootstrap");
    await expect(bootstrapCssdQuyTrinhFromMaBo(supabase as never, "B01.SET.99")).rejects.toThrow(
      /danh mục bộ dụng cụ/,
    );
  });
});

describe("planCssdBoBootstrap (S-E W4)", () => {
  it("syncs only an active cycle", async () => {
    const { planCssdBoBootstrap } = await import("../shared/application/cssd-bo-bootstrap");
    expect(planCssdBoBootstrap({ id: "qt-1", is_active: true, suds_count: 4 })).toEqual({
      kind: "SYNC_ACTIVE",
      id: "qt-1",
    });
  });

  it("never reactivates a closed (MAT / recalled) cycle — opens a fresh one, suds +1", async () => {
    const { planCssdBoBootstrap } = await import("../shared/application/cssd-bo-bootstrap");
    expect(planCssdBoBootstrap({ id: "qt-mat", is_active: false, suds_count: 4 })).toEqual({
      kind: "NEW_CYCLE",
      previousId: "qt-mat",
      sudsCount: 5,
    });
    expect(planCssdBoBootstrap({ id: "qt-old", is_active: null, suds_count: null })).toEqual({
      kind: "NEW_CYCLE",
      previousId: "qt-old",
      sudsCount: 1,
    });
  });

  it("first registration keeps DB default suds", async () => {
    const { planCssdBoBootstrap } = await import("../shared/application/cssd-bo-bootstrap");
    expect(planCssdBoBootstrap(null)).toEqual({ kind: "NEW_CYCLE", previousId: null, sudsCount: null });
  });
});

describe("bootstrapCssdQuyTrinhFromBoId (UAT 2026-11-10)", () => {
  /** Mock theo tên bảng: bảng gốc không có cột tổng; view mới có; đếm bộ con trả về `children`. */
  function mockSupabase(children: number) {
    const tables: string[] = [];
    const insert = vi.fn();
    const chain = (table: string) => {
      const q: Record<string, unknown> = {};
      q.select = vi.fn((_cols: string, opts?: { head?: boolean }) => {
        if (table === "cssd_dm_bo_dung_cu" && String(_cols).includes("tong_so_luong_dung_cu")) {
          throw new Error("cột tong_so_luong_dung_cu không có trên bảng gốc");
        }
        if (opts?.head) return { eq: () => ({ eq: async () => ({ count: children, error: null }) }) };
        return q;
      });
      q.eq = vi.fn(() => q);
      q.maybeSingle = vi.fn(async () => ({
        data: table === "v_cssd_bo_dung_cu_summary" ? { id: "b1", ma_bo: "B01.SET.03", ten_bo: "Bộ" } : null,
        error: null,
      }));
      q.order = vi.fn(() => q);
      q.limit = vi.fn(() => q);
      q.insert = insert;
      return q;
    };
    return { supabase: { from: vi.fn((t: string) => (tables.push(t), chain(t))) }, tables, insert };
  }

  it("đọc bộ từ view, không từ bảng gốc", async () => {
    const { supabase, tables } = mockSupabase(0);
    const { bootstrapCssdQuyTrinhFromBoId } = await import("../shared/application/cssd-bo-bootstrap");
    await bootstrapCssdQuyTrinhFromBoId(supabase as never, "b1").catch(() => undefined);
    expect(tables[0]).toBe("v_cssd_bo_dung_cu_summary");
  });

  it("bộ mẹ có thành phần: từ chối và không tạo chu trình", async () => {
    const { supabase, insert } = mockSupabase(2);
    const { bootstrapCssdQuyTrinhFromBoId } = await import("../shared/application/cssd-bo-bootstrap");
    await expect(bootstrapCssdQuyTrinhFromBoId(supabase as never, "b1")).rejects.toThrow(/Bộ mẹ đã tách thành phần/);
    expect(insert).not.toHaveBeenCalled();
  });
});
