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
