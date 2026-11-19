import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  scope: {} as Record<string, unknown>,
  nhanSuKhoaArgs: [] as Array<string | null | undefined>,
}));

const KHOAS = [
  { id: "khoa-minh", ma_khoa: "K1", ten_khoa: "Khoa 1", specs: null },
  { id: "khoa-khac", ma_khoa: "K2", ten_khoa: "Khoa 2", specs: null },
];

vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn() }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: async () => m.scope }));
vi.mock("@/lib/data-access", () => ({ getDb: async () => ({}) }));
vi.mock("@/lib/cache/master-data-cache", () => ({ getCachedDmKhoaPhong: async () => KHOAS }));
vi.mock("@/lib/master-data/registry-select-fetch", () => ({ fetchActiveRegistryDmRows: async () => [] }));
vi.mock("@/lib/master-data/gateway", () => ({
  buildDisplayMaps: vi.fn(),
  toDistinctIds: vi.fn(),
  mapDanhMucOptions: (rows: unknown[]) => rows,
}));
vi.mock("../repo/vst.repo", () => ({
  vstRepo: {
    getRegistryOptionsRpc: async () => ({ data: {}, error: null }),
    findVstHeaderNhanSu: async (khoaId?: string | null) => {
      m.nhanSuKhoaArgs.push(khoaId);
      return { data: [], error: null };
    },
    findVstKhuVucFallback: async () => ({ data: [], error: null }),
  },
}));

import { getVstHeaderDmDropdowns } from "./vst-read.actions";

const base = {
  roles: [] as string[],
  actorNhanSuId: "ns-minh",
  actorKhoaId: "khoa-minh",
  isAdmin: false,
  isNhanVienKsnk: false,
  isMangLuoiKsnk: false,
  isGuestStatsOnly: false,
};

async function khoaIds() {
  const r = await getVstHeaderDmDropdowns();
  if (!r.success) throw new Error(r.error);
  return r.data.khoas.map((k) => k.id);
}

describe("getVstHeaderDmDropdowns — khóa khoa theo vai (VST-038 lát A, bám lưu phiên VST)", () => {
  beforeEach(() => {
    m.nhanSuKhoaArgs = [];
  });

  it("mạng lưới thuần: chỉ khoa của mình, nhân sự lọc theo khoa mình (fail-closed)", async () => {
    m.scope = { ...base, roles: ["MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    expect(await khoaIds()).toEqual(["khoa-minh"]);
    expect(m.nhanSuKhoaArgs).toEqual(["khoa-minh"]);
  });

  it("mạng lưới thuần chưa gán khoa: danh mục rỗng", async () => {
    m.scope = { ...base, roles: ["MANG_LUOI_KSNK"], isMangLuoiKsnk: true, actorKhoaId: null };
    expect(await khoaIds()).toEqual([]);
  });

  it("NHAN_VIEN_KSNK kiêm MANG_LUOI_KSNK: thấy mọi khoa, nhân sự không lọc khoa", async () => {
    m.scope = {
      ...base,
      roles: ["NHAN_VIEN_KSNK", "MANG_LUOI_KSNK"],
      isNhanVienKsnk: true,
      isMangLuoiKsnk: true,
    };
    expect(await khoaIds()).toEqual(["khoa-minh", "khoa-khac"]);
    expect(m.nhanSuKhoaArgs).toEqual([null]);
  });

  it("NHAN_VIEN_KSNK kiêm MANG_LUOI_KSNK chưa gán khoa: vẫn có danh mục (không rỗng)", async () => {
    m.scope = {
      ...base,
      roles: ["NHAN_VIEN_KSNK", "MANG_LUOI_KSNK"],
      isNhanVienKsnk: true,
      isMangLuoiKsnk: true,
      actorKhoaId: null,
    };
    expect(await khoaIds()).toEqual(["khoa-minh", "khoa-khac"]);
  });

  it("ADMIN kiêm MANG_LUOI_KSNK: thấy mọi khoa", async () => {
    m.scope = { ...base, roles: ["ADMIN", "MANG_LUOI_KSNK"], isAdmin: true, isMangLuoiKsnk: true };
    expect(await khoaIds()).toEqual(["khoa-minh", "khoa-khac"]);
    expect(m.nhanSuKhoaArgs).toEqual([null]);
  });

  it("CHU_NHIEM_KHOA kiêm MANG_LUOI_KSNK: vẫn khóa khoa, khớp lưu phiên VST (M01, VST-029 giữ khóa)", async () => {
    m.scope = { ...base, roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    expect(await khoaIds()).toEqual(["khoa-minh"]);
    expect(m.nhanSuKhoaArgs).toEqual(["khoa-minh"]);
  });
});
