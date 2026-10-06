import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mergeDuplicateBomLinesForBo: vi.fn(),
  rangeCalls: [] as Array<[number, number]>,
  allRows: [] as Array<{ id: string; bo_dung_cu_id: string; loai_dung_cu_id: string }>,
  failFrom: null as number | null,
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => undefined),
  hasRBACAdminSupervisionBypass: vi.fn(async () => true),
}));

vi.mock("@/lib/master-data/require-cssd-catalog-master-write", () => ({
  requireCssdCatalogMasterWrite: vi.fn(async () => undefined),
}));

vi.mock("@/lib/cache/revalidate-master-data-tags", () => ({
  revalidateMasterDataRowCacheTag: vi.fn(),
}));

vi.mock("@/lib/master-data/cssd-bom-line-merge.application", () => ({
  findActiveBomLineByBoLoai: vi.fn(),
  mergeDuplicateBomLinesForBo: mocks.mergeDuplicateBomLinesForBo,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            not: () => ({
              order: () => ({
                range: async (from: number, to: number) => {
                  mocks.rangeCalls.push([from, to]);
                  if (mocks.failFrom != null && from === mocks.failFrom) {
                    return { data: null, error: { message: "page 2 fail" } };
                  }
                  return {
                    data: mocks.allRows.slice(from, to + 1),
                    error: null,
                  };
                },
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { mergeDuplicateBomLinesAction } from "./dung-cu-chi-tiet.actions";

function buildRows(total: number) {
  const rows: Array<{ id: string; bo_dung_cu_id: string; loai_dung_cu_id: string }> = [];
  for (let i = 0; i < total; i++) {
    if (i === 2100 || i === 2101) {
      rows.push({ id: `id-${i}`, bo_dung_cu_id: "bo-page3-dup", loai_dung_cu_id: "loai-x" });
    } else {
      rows.push({ id: `id-${i}`, bo_dung_cu_id: `bo-${i}`, loai_dung_cu_id: `loai-${i}` });
    }
  }
  return rows;
}

describe("mergeDuplicateBomLinesAction — đọc đủ BOM active", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rangeCalls = [];
    mocks.failFrom = null;
    mocks.allRows = buildRows(2500);
    mocks.mergeDuplicateBomLinesForBo.mockResolvedValue({
      mergedGroups: 1,
      rowsSoftDeleted: 1,
      skippedNullLoai: 0,
    });
  });

  it("đọc 3 trang (1000) và phát hiện trùng ở trang 3", async () => {
    const res = await mergeDuplicateBomLinesAction();
    expect(res.success).toBe(true);
    expect(mocks.rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(mocks.mergeDuplicateBomLinesForBo).toHaveBeenCalledWith(
      expect.anything(),
      "bo-page3-dup",
    );
    if (res.success) {
      expect(res.bosTouched).toBe(1);
    }
  });

  it("lỗi trang 2 → success:false", async () => {
    mocks.failFrom = 1000;
    const res = await mergeDuplicateBomLinesAction();
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/page 2 fail/);
    }
    expect(mocks.rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(mocks.mergeDuplicateBomLinesForBo).not.toHaveBeenCalled();
  });
});
