import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  from: vi.fn(),
  requireCssdCatalogMasterWrite: vi.fn(async () => undefined),
  logAdminAction: vi.fn(async (_input: unknown) => undefined),
}));

const KHOA_ID = "33333333-3333-4333-8333-333333333333";
const LOOKUP_ID = "44444444-4444-4444-8444-444444444444";

/** Builder update giả: ghi lại mọi .eq/.in, .select trả `rows`. */
function makeUpdateBuilder(rows: Array<{ id: string }>) {
  const filters: Array<[string, string, unknown]> = [];
  const b = {
    filters,
    eq: vi.fn((col: string, val: unknown) => {
      filters.push(["eq", col, val]);
      return b;
    }),
    in: vi.fn((col: string, val: unknown) => {
      filters.push(["in", col, val]);
      return b;
    }),
    select: vi.fn(async () => ({ data: rows, error: null })),
  };
  return b;
}

vi.mock("@/lib/admin-audit", () => ({ logAdminAction: mocks.logAdminAction }));

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
    mocks.from.mockImplementation((_table: string) => ({
      select: () => ({
        order: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
      insert: mocks.insert,
      update: () => makeUpdateBuilder([{ id: KHOA_ID }]),
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
    const update = vi.fn(() => makeUpdateBuilder([{ id: KHOA_ID }]));
    const del = vi.fn();
    mocks.from.mockImplementation(() => ({
      update,
      delete: del,
    }));
    const { softDeleteMasterRow } = await import("./master-crud-core");
    const res = await softDeleteMasterRow("mdm_dm_khoa_phong", KHOA_ID);
    expect(res).toEqual({ success: true });
    expect(mocks.logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MASTER_SOFT_DELETE", targetTable: "mdm_dm_khoa_phong", targetId: KHOA_ID }),
    );
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
    await softDeleteMasterRow("mdm_dm_khoa_phong", KHOA_ID);
    expect(mocks.requireCssdCatalogMasterWrite).not.toHaveBeenCalled();
  });

  it("zod: id không phải UUID bị từ chối, không chạm DB và không ghi nhật ký", async () => {
    const { softDeleteMasterRow, upsertMasterRow, toggleMasterStatus, softDeleteManyMasterRows } = await import("./master-crud-core");
    mocks.from.mockClear();
    expect(await softDeleteMasterRow("mdm_dm_khoa_phong", "khoa-1")).toMatchObject({ success: false, error: "Mã bản ghi không hợp lệ." });
    expect(await toggleMasterStatus("mdm_dm_khoa_phong", "khoa-1", true)).toMatchObject({ success: false });
    expect(await upsertMasterRow("mdm_dm_khoa_phong", "", {})).toMatchObject({ success: false, error: "Chưa có dữ liệu để lưu." });
    expect(await softDeleteManyMasterRows("mdm_dm_khoa_phong", [])).toMatchObject({ success: false });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.logAdminAction).not.toHaveBeenCalled();
  });

  it("nhật ký: tạo mới ghi MASTER_CREATE, bỏ trường nhạy cảm và cắt chuỗi dài", async () => {
    const { upsertMasterRow } = await import("./master-crud-core");
    await upsertMasterRow("cssd_dm_hoa_chat", "", { ten_hoa_chat: "Cidex", password: "x", ghi_chu: "y".repeat(300) });
    const call = mocks.logAdminAction.mock.calls.at(-1)?.[0] as { action: string; after: Record<string, unknown> };
    expect(call.action).toBe("MASTER_CREATE");
    expect(call.after).not.toHaveProperty("password");
    expect(String(call.after.ghi_chu).length).toBeLessThanOrEqual(121);
  });

  describe("ACC-2: sys_lookup_value chỉ ghi trong đúng category_type", () => {
    function mockLookupUpdate(rows: Array<{ id: string }>) {
      const builder = makeUpdateBuilder(rows);
      const update = vi.fn(() => builder);
      mocks.from.mockImplementation(() => ({
        update,
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { code: "CD01" }, error: null }) }) }),
        }),
      }));
      return builder;
    }

    it.each([
      ["sửa", async (m: typeof import("./master-crud-core")) =>
        m.upsertMasterRow("mdm_dm_chuc_danh", LOOKUP_ID, { ma_chuc_danh: "CD01", ten_chuc_danh: "Bác sĩ" })],
      ["bật/tắt", async (m: typeof import("./master-crud-core")) => m.toggleMasterStatus("mdm_dm_chuc_danh", LOOKUP_ID, true)],
      ["xóa mềm", async (m: typeof import("./master-crud-core")) => m.softDeleteMasterRow("mdm_dm_chuc_danh", LOOKUP_ID)],
      ["xóa mềm nhiều", async (m: typeof import("./master-crud-core")) =>
        m.softDeleteManyMasterRows("mdm_dm_chuc_danh", [LOOKUP_ID])],
    ])("%s: lọc thêm category_type", async (_label, run) => {
      const builder = mockLookupUpdate([{ id: LOOKUP_ID }]);
      const m = await import("./master-crud-core");
      const res = await run(m);
      expect(res).toEqual({ success: true });
      expect(mocks.from).toHaveBeenCalledWith("sys_lookup_value");
      expect(builder.filters).toContainEqual(["eq", "category_type", "CHUC_DANH"]);
    });

    it.each([
      ["sửa", async (m: typeof import("./master-crud-core")) =>
        m.upsertMasterRow("mdm_dm_chuc_danh", LOOKUP_ID, { ma_chuc_danh: "CD01", ten_chuc_danh: "Bác sĩ" })],
      ["bật/tắt", async (m: typeof import("./master-crud-core")) => m.toggleMasterStatus("mdm_dm_chuc_danh", LOOKUP_ID, true)],
      ["xóa mềm", async (m: typeof import("./master-crud-core")) => m.softDeleteMasterRow("mdm_dm_chuc_danh", LOOKUP_ID)],
      ["xóa mềm nhiều", async (m: typeof import("./master-crud-core")) =>
        m.softDeleteManyMasterRows("mdm_dm_chuc_danh", [LOOKUP_ID])],
    ])("%s: id thuộc nhóm khác (0 dòng) → lỗi tiếng Việt, không ghi nhật ký", async (_label, run) => {
      mockLookupUpdate([]);
      const m = await import("./master-crud-core");
      const res = await run(m);
      expect(res).toMatchObject({ success: false, error: expect.stringContaining("Không tìm thấy mục danh mục") });
      expect(mocks.logAdminAction).not.toHaveBeenCalled();
    });
  });
});
