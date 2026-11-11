import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
}));

import { isLoaKhoaInBaGrid } from "./giam-sat-nkbv-write.helpers";

function fakeDb(grid: unknown[], ba: unknown) {
  return {
    from: (t: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.limit = async () => ({ data: t === "nkbv_fact_ba_ngay_khoa" ? grid : [] });
      chain.maybeSingle = async () => ({ data: ba });
      return chain;
    },
  } as never;
}

describe("NKBV-013 isLoaKhoaInBaGrid", () => {
  it("khoa có trong lưới ngày–khoa → true", async () => {
    expect(await isLoaKhoaInBaGrid(fakeDb([{ khoa_id: "k1" }], null), "BA1", "k1")).toBe(true);
  });
  it("không có trong lưới nhưng là khoa điều trị → true", async () => {
    expect(await isLoaKhoaInBaGrid(fakeDb([], { khoa_dieu_tri_id: "k1" }), "BA1", "k1")).toBe(true);
  });
  it("khoa lạ → false", async () => {
    expect(await isLoaKhoaInBaGrid(fakeDb([], { khoa_dieu_tri_id: "k2" }), "BA1", "k1")).toBe(false);
    expect(await isLoaKhoaInBaGrid(fakeDb([], null), "BA1", "k1")).toBe(false);
  });
});
