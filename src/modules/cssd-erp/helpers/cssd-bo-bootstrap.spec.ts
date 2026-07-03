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
