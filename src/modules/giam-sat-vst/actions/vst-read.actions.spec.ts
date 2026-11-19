import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  scope: {} as Record<string, unknown>,
  nhanSuKhoaArgs: [] as Array<string | null | undefined>,
  sessionView: null as Record<string, unknown> | null,
  obsCalls: 0,
  permCalls: [] as string[],
}));

const KHOAS = [
  { id: "khoa-minh", ma_khoa: "K1", ten_khoa: "Khoa 1", specs: null },
  { id: "khoa-khac", ma_khoa: "K2", ten_khoa: "Khoa 2", specs: null },
];

vi.mock("@/lib/server-permission", () => ({
  // Giống thật: chỉ GIAM_SAT_VST:view được cấp; DANH_MUC_ORG:view không vai nào có (VST-041).
  verifyPermission: async (moduleKey: string) => {
    m.permCalls.push(moduleKey);
    if (moduleKey !== "GIAM_SAT_VST") throw new Error(`không có quyền [view] trên module [${moduleKey}]`);
  },
}));
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
    getVstSessionDetailView: async () => ({ data: m.sessionView, error: null }),
    getVstSessionMetadataById: async () => ({ data: null, error: null }),
    getVstObservationsView: async () => {
      m.obsCalls += 1;
      return { data: [], error: null };
    },
  },
}));

import { getVSTSessionDetail, getVstHeaderDmDropdowns, getVstViewDanhMuc } from "./vst-read.actions";

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

  it("LANH_DAO_KHOA thuần: chỉ khoa của mình, nhân sự lọc theo khoa mình (VST-028, không lộ tên nhân sự toàn viện)", async () => {
    m.scope = { ...base, roles: ["LANH_DAO_KHOA"] };
    expect(await khoaIds()).toEqual(["khoa-minh"]);
    expect(m.nhanSuKhoaArgs).toEqual(["khoa-minh"]);
  });

  it("LANH_DAO_KHOA chưa gán khoa: danh mục rỗng", async () => {
    m.scope = { ...base, roles: ["LANH_DAO_KHOA"], actorKhoaId: null };
    expect(await khoaIds()).toEqual([]);
  });

  it("LANH_DAO_KHOA kiêm NHAN_VIEN_KSNK: thấy mọi khoa", async () => {
    m.scope = { ...base, roles: ["LANH_DAO_KHOA", "NHAN_VIEN_KSNK"], isNhanVienKsnk: true };
    expect(await khoaIds()).toEqual(["khoa-minh", "khoa-khac"]);
    expect(m.nhanSuKhoaArgs).toEqual([null]);
  });
});

describe("getVSTSessionDetail — LANH_DAO_KHOA chỉ mở phiên khoa mình (VST-028, R1.34)", () => {
  beforeEach(() => {
    m.obsCalls = 0;
    m.scope = { ...base, roles: ["LANH_DAO_KHOA"] };
  });

  it("phiên của khoa khác: báo như không tồn tại, không đọc quan sát", async () => {
    m.sessionView = { id: "s-b", khoa_id: "khoa-khac", is_active: true };
    const r = await getVSTSessionDetail("s-b");
    expect(r).toEqual({ success: false, error: "Không tìm thấy phiên giám sát." });
    expect(m.obsCalls).toBe(0);
  });

  it("LANH_DAO_KHOA chưa gán khoa: không mở được phiên nào", async () => {
    m.scope = { ...base, roles: ["LANH_DAO_KHOA"], actorKhoaId: null };
    m.sessionView = { id: "s-a", khoa_id: "khoa-minh", is_active: true };
    const r = await getVSTSessionDetail("s-a");
    expect(r).toEqual({ success: false, error: "Không tìm thấy phiên giám sát." });
    expect(m.obsCalls).toBe(0);
  });
});

describe("getVstViewDanhMuc — danh mục cho chi tiết/in phiếu chỉ cần GIAM_SAT_VST:view (VST-041)", () => {
  beforeEach(() => {
    m.permCalls = [];
  });

  it("LANH_DAO_KHOA / CNK mạng lưới: có đủ khoa, khu vực, nghề nghiệp mà không đòi DANH_MUC_ORG", async () => {
    for (const roles of [["LANH_DAO_KHOA"], ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"]]) {
      m.permCalls = [];
      m.scope = { ...base, roles, isMangLuoiKsnk: roles.includes("MANG_LUOI_KSNK") };
      const r = await getVstViewDanhMuc();
      if (!r.success) throw new Error(r.error);
      // khoa của phiên (kể cả import cũ ở khoa khác) vẫn có tên để hiển thị
      expect(r.data.khoas.map((k) => k.id)).toEqual(["khoa-minh", "khoa-khac"]);
      expect(Array.isArray(r.data.khuVucs)).toBe(true);
      expect(Array.isArray(r.data.ngheNghieps)).toBe(true);
      expect(m.permCalls).toEqual(["GIAM_SAT_VST"]);
    }
  });

  it("khách thống kê / hội đồng KSNK: bị chặn như chi tiết phiên", async () => {
    m.scope = { ...base, roles: ["HOI_DONG_KSNK"] };
    expect((await getVstViewDanhMuc()).success).toBe(false);
    m.scope = { ...base, isGuestStatsOnly: true };
    expect((await getVstViewDanhMuc()).success).toBe(false);
  });
});
