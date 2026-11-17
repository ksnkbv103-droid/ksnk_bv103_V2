import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBoTongIdForBomWrite } from "./cssd-bom-write-target";

function client(row: unknown): SupabaseClient {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
    }),
  } as unknown as SupabaseClient;
}

describe("resolveBoTongIdForBomWrite", () => {
  it("bộ con CHIU_NHIET quy về bộ cha", async () => {
    expect(await resolveBoTongIdForBomWrite(client({ parent_bo_id: "P", vai_tro_tach: "CHIU_NHIET" }), "C")).toBe("P");
  });
  it("bộ con KHONG_CHIU_NHIET quy về bộ cha", async () => {
    expect(await resolveBoTongIdForBomWrite(client({ parent_bo_id: "P", vai_tro_tach: "KHONG_CHIU_NHIET" }), "C")).toBe("P");
  });
  it("bộ thường giữ nguyên", async () => {
    expect(await resolveBoTongIdForBomWrite(client({ parent_bo_id: null, vai_tro_tach: null }), "B")).toBe("B");
  });
  it("có cha nhưng vai trò khác thì giữ nguyên", async () => {
    expect(await resolveBoTongIdForBomWrite(client({ parent_bo_id: "P", vai_tro_tach: "KHAC" }), "B")).toBe("B");
  });
});
