import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensure: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  scope: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(),
  hasRBACAdminSupervisionBypass: vi.fn(async () => false),
}));
vi.mock("@/lib/supabase-server", () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: vi.fn(async () => "ns-1") }));
vi.mock("../lib/qlcv-action-guard", () => ({ ensureQlcvKsnkAccess: mocks.ensure }));
vi.mock("../lib/qlcv-list-scope", async (orig) => ({
  ...(await orig<typeof import("../lib/qlcv-list-scope")>()),
  resolveQlcvListScope: mocks.scope,
}));

import { deleteDinhKyMau, setDinhKyMauActive, upsertDinhKyMau } from "./dinh-ky.actions";

const ID = "44444444-4444-4444-8444-444444444444";

function client() {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = mocks.maybeSingle;
  chain.update = (v: unknown) => {
    mocks.update(v);
    return chain;
  };
  chain.delete = () => {
    mocks.del();
    return chain;
  };
  chain.then = (res: (v: unknown) => void) => res({ error: null, count: 0 });
  return { from: () => chain };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensure.mockImplementation(async () => ({ supabase: client(), ksnkKhoaId: "k" }));
  mocks.scope.mockResolvedValue({ bypassAll: false, ksnkKhoaId: "k", actorStaffId: "ns-1" });
});

describe("mẫu định kỳ QLCV — kiểm tồn tại / scope / uuid", () => {
  it("id không phải uuid bị từ chối", async () => {
    await expect(setDinhKyMauActive("x", true)).rejects.toThrow(/không hợp lệ/);
    await expect(deleteDinhKyMau("x")).rejects.toThrow(/không hợp lệ/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("mẫu không tồn tại: báo lỗi, không ghi", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(setDinhKyMauActive(ID, false)).rejects.toThrow(/Không tìm thấy mẫu/);
    await expect(deleteDinhKyMau(ID)).rejects.toThrow(/Không tìm thấy mẫu/);
    await expect(
      upsertDinhKyMau({ id: ID, tieu_de: "t", ma_chu_ky: "DAILY", ngay_bat_dau: "2026-11-01", nguoi_phu_trach_id: "a" }),
    ).rejects.toThrow(/Không tìm thấy mẫu/);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.del).not.toHaveBeenCalled();
  });
  it("bật mẫu chưa có người phụ trách bị từ chối; tắt thì qua", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: ID, nguoi_phu_trach_id: null, nguoi_tao_id: "ns-1" }, error: null });
    await expect(setDinhKyMauActive(ID, true)).rejects.toThrow(/người phụ trách/);
    await expect(setDinhKyMauActive(ID, false)).resolves.toBeUndefined();
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
  it("mẫu có người phụ trách: bật được", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: ID, nguoi_phu_trach_id: "ns-2", nguoi_tao_id: "ns-1" }, error: null });
    await expect(setDinhKyMauActive(ID, true)).resolves.toBeUndefined();
  });
});
