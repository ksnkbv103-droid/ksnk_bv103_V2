import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestAuthUser: vi.fn(),
  getCachedDmKhoaPhong: vi.fn(),
  getCachedDmNgheNghiep: vi.fn(),
  getCachedDmKhuVucGiamSat: vi.fn(),
  getCachedDmKhoiKhoa: vi.fn(),
  getRegistryEntryOrNull: vi.fn(),
  fetchActiveRegistryDmRows: vi.fn(),
  createServerSupabaseUserClient: vi.fn(),
}));

vi.mock("@/lib/auth/rbac-request", () => ({
  getRequestAuthUser: mocks.getRequestAuthUser,
}));

vi.mock("@/lib/cache/master-data-cache", () => ({
  getCachedDmKhoaPhong: mocks.getCachedDmKhoaPhong,
  getCachedDmNgheNghiep: mocks.getCachedDmNgheNghiep,
  getCachedDmKhuVucGiamSat: mocks.getCachedDmKhuVucGiamSat,
  getCachedDmKhoiKhoa: mocks.getCachedDmKhoiKhoa,
}));

vi.mock("./domain-registry", () => ({
  getRegistryEntryOrNull: mocks.getRegistryEntryOrNull,
}));

vi.mock("./registry-select-fetch", () => ({
  fetchActiveRegistryDmRows: mocks.fetchActiveRegistryDmRows,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: mocks.createServerSupabaseUserClient,
}));

import { getActiveMasterDataAction } from "./master-data.actions";

describe("getActiveMasterDataAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chưa đăng nhập → lỗi, không gọi cache/registry fetch", async () => {
    mocks.getRequestAuthUser.mockResolvedValue(null);

    await expect(getActiveMasterDataAction("KHOA_PHONG")).rejects.toThrow("Chưa đăng nhập");

    expect(mocks.getCachedDmKhoaPhong).not.toHaveBeenCalled();
    expect(mocks.getCachedDmNgheNghiep).not.toHaveBeenCalled();
    expect(mocks.getCachedDmKhuVucGiamSat).not.toHaveBeenCalled();
    expect(mocks.getCachedDmKhoiKhoa).not.toHaveBeenCalled();
    expect(mocks.fetchActiveRegistryDmRows).not.toHaveBeenCalled();
    expect(mocks.getRegistryEntryOrNull).not.toHaveBeenCalled();
  });

  it("đã đăng nhập → KHOA_PHONG map id/ma/ten như cũ", async () => {
    mocks.getRequestAuthUser.mockResolvedValue({ id: "user-1" });
    mocks.getCachedDmKhoaPhong.mockResolvedValue([
      { id: "kp-1", ma_khoa: "K01", ten_khoa: "Khoa A", khoi_id: null },
    ]);

    await expect(getActiveMasterDataAction("KHOA_PHONG")).resolves.toEqual([
      { id: "kp-1", ma: "K01", ten: "Khoa A" },
    ]);
    expect(mocks.getCachedDmKhoaPhong).toHaveBeenCalledOnce();
    expect(mocks.fetchActiveRegistryDmRows).not.toHaveBeenCalled();
  });

  it("đã đăng nhập → loại chưa khai báo → lỗi như cũ", async () => {
    mocks.getRequestAuthUser.mockResolvedValue({ id: "user-1" });
    mocks.getRegistryEntryOrNull.mockReturnValue(null);

    await expect(getActiveMasterDataAction("LOAI_KHONG_TON_TAI")).rejects.toThrow(
      "Loại danh mục chưa được khai báo: LOAI_KHONG_TON_TAI",
    );
    expect(mocks.fetchActiveRegistryDmRows).not.toHaveBeenCalled();
  });
});
