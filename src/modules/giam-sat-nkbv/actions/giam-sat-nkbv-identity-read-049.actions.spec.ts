import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NKBV-049 (PO 19/11, P1=A): 3 đường đọc bằng admin client (phân tích BA, sổ đặt–rút ×2) là đọc CÓ DANH TÍNH,
 * nên dùng phạm vi danh tính (`getNkbvIdentityScope`): vai ngoài KSNK có quyền xem chỉ thấy khoa của mình,
 * chưa gán khoa → không thấy gì. Trước đây dùng `getNkbvKhoaRestriction` (mọi vai không phải Mạng lưới = toàn viện).
 */
const mocks = vi.hoisted(() => ({
  scope: vi.fn(),
  baKhoa: vi.fn(),
  fromTables: [] as string[],
}));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: mocks.scope }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      mocks.fromTables.push(table);
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "gte", "lte", "order", "limit", "range"]) chain[m] = () => chain;
      chain.maybeSingle = async () => ({ data: { khoa_dieu_tri_id: mocks.baKhoa() }, error: null });
      chain.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
      return chain;
    },
  }),
}));

import { loadNkbvBaPhanTichSessions } from "./giam-sat-nkbv-ba-phan-tich.actions";
import { getDevicePrefillForStay, previewMauSoFromDeviceRegistryAction } from "./giam-sat-nkbv-device-registry.actions";

const K1 = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";
const OUT = "Hồ sơ nằm ngoài khoa của bạn.";

const base = { isAdmin: false, isNhanVienKsnk: false, isMangLuoiKsnk: false, isGuestStatsOnly: false, actorNhanSuId: null };
/** Vai ngoài KSNK có NKBV:view (NKBV-038): không phải Mạng lưới nên phạm vi thống kê cũ cho toàn viện. */
const NGOAI_KSNK_K1 = { ...base, roles: ["BAC_SI"], actorKhoaId: K1 };
const NGOAI_KSNK_KHONG_KHOA = { ...base, roles: ["BAC_SI"], actorKhoaId: null };
const NV_KSNK = { ...base, roles: ["NHAN_VIEN_KSNK"], isNhanVienKsnk: true, actorKhoaId: null };
const CNK_TOAN_VIEN = { ...base, roles: ["CHU_NHIEM_KHOA"], actorKhoaId: K1 };
const HOI_DONG = { ...base, roles: ["HOI_DONG_KSNK"], actorKhoaId: null };
/** Mạng lưới KSNK (kể cả Chủ nhiệm khoa kiêm Mạng lưới) chỉ thấy khoa mình. */
const MANG_LUOI_K1 = { ...base, roles: ["CHU_NHIEM_KHOA"], isMangLuoiKsnk: true, actorKhoaId: K1 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fromTables.length = 0;
  mocks.baKhoa.mockReturnValue(K2);
});

describe("NKBV-049: loadNkbvBaPhanTichSessions", () => {
  it("vai ngoài KSNK đọc BA của khoa khác → từ chối, không đọc bảng phân tích", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_K1);
    const res = await loadNkbvBaPhanTichSessions({ ma_benh_an: "BA1" });
    expect(res).toMatchObject({ success: false, error: OUT });
    expect(mocks.fromTables).not.toContain("nkbv_fact_ba_phan_tich");
  });

  it("vai ngoài KSNK chưa gán khoa → từ chối", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_KHONG_KHOA);
    const res = await loadNkbvBaPhanTichSessions({ ma_benh_an: "BA1" });
    expect(res).toMatchObject({ success: false, error: OUT });
    expect(mocks.fromTables).not.toContain("nkbv_fact_ba_phan_tich");
  });

  it("vai ngoài KSNK đọc BA của chính khoa mình → được", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_K1);
    mocks.baKhoa.mockReturnValue(K1);
    const res = await loadNkbvBaPhanTichSessions({ ma_benh_an: "BA1" });
    expect(res.success).toBe(true);
    expect(mocks.fromTables).toContain("nkbv_fact_ba_phan_tich");
  });

  it("NV KSNK, Hội đồng và Chủ nhiệm khoa toàn viện vẫn đọc BA khoa khác", async () => {
    for (const actor of [NV_KSNK, HOI_DONG, CNK_TOAN_VIEN]) {
      mocks.fromTables.length = 0;
      mocks.scope.mockResolvedValue(actor);
      const res = await loadNkbvBaPhanTichSessions({ ma_benh_an: "BA1" });
      expect(res.success).toBe(true);
      expect(mocks.fromTables).toContain("nkbv_fact_ba_phan_tich");
    }
  });

  it("Mạng lưới (kể cả CNK kiêm Mạng lưới) đọc BA khoa khác → từ chối", async () => {
    mocks.scope.mockResolvedValue(MANG_LUOI_K1);
    const res = await loadNkbvBaPhanTichSessions({ ma_benh_an: "BA1" });
    expect(res).toMatchObject({ success: false, error: OUT });
    expect(mocks.fromTables).not.toContain("nkbv_fact_ba_phan_tich");
  });
});

describe("NKBV-049: getDevicePrefillForStay (sổ đặt–rút theo BA)", () => {
  it("vai ngoài KSNK đọc BA của khoa khác → từ chối, không đọc sổ", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_K1);
    const res = await getDevicePrefillForStay("BA1", "CENTRAL_LINE");
    expect(res).toEqual({ success: false, error: OUT });
    expect(mocks.fromTables).not.toContain("nkbv_v_ba_dung_cu_dat_rut");
  });

  it("BA của chính khoa mình, và NV KSNK với BA khoa khác → được đọc sổ", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_K1);
    mocks.baKhoa.mockReturnValue(K1);
    expect((await getDevicePrefillForStay("BA1", "CENTRAL_LINE")).success).toBe(true);
    mocks.baKhoa.mockReturnValue(K2);
    mocks.scope.mockResolvedValue(NV_KSNK);
    expect((await getDevicePrefillForStay("BA1", "CENTRAL_LINE")).success).toBe(true);
    expect(mocks.fromTables.filter((t) => t === "nkbv_v_ba_dung_cu_dat_rut")).toHaveLength(2);
  });
});

describe("NKBV-049: previewMauSoFromDeviceRegistryAction", () => {
  const range = { from: "2026-11-01", to: "2026-11-10" };

  it("vai ngoài KSNK chưa gán khoa → từ chối, không đọc sổ", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_KHONG_KHOA);
    const res = await previewMauSoFromDeviceRegistryAction(range);
    expect(res).toEqual({ success: false, error: OUT });
    expect(mocks.fromTables).not.toContain("nkbv_v_ba_dung_cu_dat_rut");
  });

  it("vai ngoài KSNK chọn khoa khác hoặc BA khoa khác → từ chối", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_K1);
    expect(await previewMauSoFromDeviceRegistryAction({ ...range, khoa_id: K2 })).toEqual({ success: false, error: OUT });
    expect(await previewMauSoFromDeviceRegistryAction({ ...range, ma_benh_an: "BA1" })).toEqual({
      success: false,
      error: OUT,
    });
    expect(mocks.fromTables).not.toContain("nkbv_v_ba_dung_cu_dat_rut");
  });

  it("vai khoa chọn đúng khoa mình hoặc không chọn khoa → được, ép về khoa mình", async () => {
    mocks.scope.mockResolvedValue(NGOAI_KSNK_K1);
    expect((await previewMauSoFromDeviceRegistryAction({ ...range, khoa_id: K1 })).success).toBe(true);
    expect((await previewMauSoFromDeviceRegistryAction(range)).success).toBe(true);
    expect(mocks.fromTables).toContain("nkbv_v_ba_dung_cu_dat_rut");
  });

  it("NV KSNK xem được khoa khác", async () => {
    mocks.scope.mockResolvedValue(NV_KSNK);
    const res = await previewMauSoFromDeviceRegistryAction({ ...range, khoa_id: K2 });
    expect(res.success).toBe(true);
  });
});
