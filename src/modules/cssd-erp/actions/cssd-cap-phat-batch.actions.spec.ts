import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NEN-016 lát E: `khoaNhanId` trỏ `mdm_dm_khoa_phong` (có khoa KSNK id seed không chuẩn RFC
 * `aaaaaaaa-bbbb-cccc-dddd-000000000001`); `z.string().uuid()` của Zod 4 từ chối id đó dù cột Postgres `uuid` chấp nhận.
 */
const mocks = vi.hoisted(() => ({
  scanQR: vi.fn(),
  khoa: { data: { id: "x" } as unknown, error: null as unknown },
  eqIds: [] as string[],
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          mocks.eqIds.push(val);
          return { eq: () => ({ maybeSingle: async () => mocks.khoa }) };
        },
      }),
    }),
  }),
}));
vi.mock("@/lib/cssd-server-gates", () => ({ verifyCssdWorkflowEdit: vi.fn(async () => undefined) }));
vi.mock("./cssd-scan.actions", () => ({ scanQR: (...a: unknown[]) => mocks.scanQR(...a) }));

import { capPhatNhieuBoAction } from "./cssd-cap-phat-batch.actions";

const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
const JUNK = "khong-phai-uuid";

describe("capPhatNhieuBoAction — khoaNhanId (NEN-016)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eqIds = [];
    mocks.khoa = { data: { id: "x" }, error: null };
    mocks.scanQR.mockResolvedValue({ tenBoDungCu: "Bộ A", quyTrinhId: "qt-1", daCapTruoc: false });
  });

  it("nhận id khoa seed không chuẩn RFC và chuyển nguyên id xuống scanQR", async () => {
    const res = await capPhatNhieuBoAction({ khoaNhanId: SEED, maQrs: ["B01.SET.01"] });
    expect(res.success).toBe(true);
    expect(mocks.eqIds[0]).toBe(SEED);
    expect(mocks.scanQR).toHaveBeenCalledWith("B01.SET.01", "CAP_PHAT", { khoa_nhan_id: SEED });
  });

  it("nhận UUID v4 chuẩn", async () => {
    const res = await capPhatNhieuBoAction({ khoaNhanId: V4, maQrs: ["B01.SET.01"] });
    expect(res.success).toBe(true);
  });

  it("chuỗi không phải UUID bị từ chối trước khi tra khoa hay quét", async () => {
    const res = await capPhatNhieuBoAction({ khoaNhanId: JUNK, maQrs: ["B01.SET.01"] });
    expect(res).toEqual({ success: false, error: "Chưa chọn nơi nhận." });
    expect(mocks.eqIds).toHaveLength(0);
    expect(mocks.scanQR).not.toHaveBeenCalled();
  });
});
