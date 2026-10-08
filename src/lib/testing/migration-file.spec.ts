import { describe, expect, it, vi } from "vitest";

const { readdirSync } = vi.hoisted(() => ({ readdirSync: vi.fn<(dir: string) => string[]>() }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, readdirSync: (dir: string) => readdirSync(dir) };
});

import { findMigrationFile } from "./migration-file";

describe("findMigrationFile", () => {
  it("tìm theo tên sau timestamp, chịu được đổi version", () => {
    readdirSync.mockReturnValue([
      "20261006024934_nkbv_rates_fix_ambiguous_ma_khoa.sql",
      "20261006025128_gsc_strategic_materialized_base.sql",
    ]);
    expect(findMigrationFile("nkbv_rates_fix_ambiguous_ma_khoa")).toMatch(
      /supabase[\\/]migrations[\\/]20261006024934_nkbv_rates_fix_ambiguous_ma_khoa\.sql$/,
    );
    expect(findMigrationFile("gsc_strategic_materialized_base.sql")).toMatch(/20261006025128_/);
  });

  it("không khớp hậu tố một phần (tên phải trùng nguyên phần sau timestamp)", () => {
    readdirSync.mockReturnValue(["20260925010536_x_cssd_ledger_atomic.sql"]);
    expect(() => findMigrationFile("cssd_ledger_atomic")).toThrow(/thấy 0/);
  });

  it("0 hoặc >1 file → throw", () => {
    readdirSync.mockReturnValue([]);
    expect(() => findMigrationFile("gsc_map_tables_rls")).toThrow(/thấy 0/);
    readdirSync.mockReturnValue([
      "20260927171305_qlcv_wave3_drop_dm_loai_trang_thai.sql",
      "20260927171313_qlcv_wave3_drop_dm_loai_trang_thai.sql",
    ]);
    expect(() => findMigrationFile("qlcv_wave3_drop_dm_loai_trang_thai")).toThrow(/thấy 2/);
  });
});
