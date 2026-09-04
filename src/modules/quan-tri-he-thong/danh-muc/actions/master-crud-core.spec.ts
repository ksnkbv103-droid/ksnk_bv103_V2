import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  updateEq: vi.fn(),
  from: vi.fn(),
  requireCssdCatalogMasterWrite: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

vi.mock("@/lib/cache/revalidate-master-data-tags", () => ({
  revalidateMasterDataRowCacheTag: vi.fn(),
}));

vi.mock("@/lib/master-data/require-cssd-catalog-master-write", () => ({
  requireCssdCatalogMasterWrite: mocks.requireCssdCatalogMasterWrite,
}));

describe("master-crud-core allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCssdCatalogMasterWrite.mockResolvedValue(undefined);
    mocks.insert.mockResolvedValue({ error: null });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((_table: string) => ({
      select: () => ({
        order: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
      insert: mocks.insert,
      update: () => ({ eq: mocks.updateEq }),
    }));
  });

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

  it("writes khu vực giám sát to sys_lookup_value with category_type", async () => {
    const { upsertMasterRow } = await import("./master-crud-core");
    const res = await upsertMasterRow("gstt_dm_khu_vuc_giam_sat", "", {
      ma_khu_vuc: "KV_HANH_LANG_A",
      ten_khu_vuc: "Hành lang A",
      is_active: true,
    });
    expect(res).toEqual({ success: true });
    expect(mocks.from).toHaveBeenCalledWith("sys_lookup_value");
    expect(mocks.from).not.toHaveBeenCalledWith("gstt_dm_khu_vuc_giam_sat");
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        category_type: "KHU_VUC_GIAM_SAT",
        code: "KV_HANH_LANG_A",
        name: "Hành lang A",
        is_active: true,
      }),
    ]);
  });

  it("DM-1: tắt khoa ghi is_active, không xóa dòng", async () => {
    const update = vi.fn(() => ({ eq: mocks.updateEq, in: vi.fn().mockResolvedValue({ error: null }) }));
    const del = vi.fn();
    mocks.from.mockImplementation(() => ({
      update,
      delete: del,
    }));
    const { softDeleteMasterRow } = await import("./master-crud-core");
    const res = await softDeleteMasterRow("mdm_dm_khoa_phong", "khoa-1");
    expect(res).toEqual({ success: true });
    expect(mocks.from).toHaveBeenCalledWith("mdm_dm_khoa_phong");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    expect(del).not.toHaveBeenCalled();
  });

  it("D5: hard-write cssd catalog master goes through requireCssdCatalogMasterWrite", async () => {
    const { upsertMasterRow } = await import("./master-crud-core");
    const res = await upsertMasterRow("cssd_dm_loai_dung_cu", "", {
      ma_loai: "DC-TEST",
      ten_loai: "Test",
      is_active: true,
    });
    expect(res).toEqual({ success: true });
    expect(mocks.requireCssdCatalogMasterWrite).toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith("cssd_dm_loai_dung_cu");
  });

  it("D5: non-catalog tables skip requireCssdCatalogMasterWrite", async () => {
    const { softDeleteMasterRow } = await import("./master-crud-core");
    await softDeleteMasterRow("mdm_dm_khoa_phong", "khoa-2");
    expect(mocks.requireCssdCatalogMasterWrite).not.toHaveBeenCalled();
  });
});
