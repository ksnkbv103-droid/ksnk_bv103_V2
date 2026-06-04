import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/cache/revalidate-master-data-tags", () => ({
  revalidateMasterDataRowCacheTag: vi.fn(),
}));

describe("master-crud-core allowlist", () => {
  it("rejects unknown table", async () => {
    const { listMasterRows } = await import("./master-crud-core");
    await expect(listMasterRows("dict_legacy", "id")).rejects.toThrow(/allowlist/);
  });

  it("accepts contract view mdm_dm_khoa_phong", async () => {
    const { listMasterRows } = await import("./master-crud-core");
    const res = await listMasterRows("mdm_dm_khoa_phong", "ma_khoa");
    expect(res.success).toBe(true);
  });

  it("accepts physical table mdm_dm_khoa_phong", async () => {
    const { listMasterRows } = await import("./master-crud-core");
    const res = await listMasterRows("mdm_dm_khoa_phong", "ma_khoa");
    expect(res.success).toBe(true);
  });
});
