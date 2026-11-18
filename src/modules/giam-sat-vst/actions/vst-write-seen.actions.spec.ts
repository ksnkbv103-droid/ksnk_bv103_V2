import { beforeEach, describe, expect, it, vi } from "vitest";

const SID = "11111111-1111-4111-8111-111111111111";

const m = vi.hoisted(() => ({
  scope: {} as Record<string, unknown>,
  updated: [] as string[][],
  row: { id: "", khoa_id: "khoa-khac", nguoi_giam_sat_id: "ns-khac" } as Record<string, string>,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn() }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: async () => m.scope }));
vi.mock("../repo/vst.repo", () => ({
  vstRepo: {
    // Phiên ở khoa khác, do người khác giám sát — nằm ngoài khoa «của mình».
    findVstSessionsForSeen: async () => ({
      data: [{ ...m.row, id: SID }],
      error: null,
    }),
    updateVstSessionsSeen: async (ids: string[]) => {
      m.updated.push(ids);
      return { error: null };
    },
  },
}));

import { markVSTSessionsSeen } from "./vst-write-seen.actions";

const base = {
  roles: [] as string[],
  actorNhanSuId: "ns-minh",
  actorKhoaId: "khoa-minh",
  isAdmin: false,
  isNhanVienKsnk: false,
  isMangLuoiKsnk: false,
  isGuestStatsOnly: false,
};

describe("markVSTSessionsSeen — phạm vi khoa (VST-029)", () => {
  beforeEach(() => {
    m.updated = [];
    m.row = { id: SID, khoa_id: "khoa-khac", nguoi_giam_sat_id: "ns-khac" };
  });

  it("mạng lưới thuần: phiên ngoài khoa bị chặn", async () => {
    m.scope = { ...base, roles: ["MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    const r = await markVSTSessionsSeen([SID]);
    expect(r).toEqual({ success: false, error: "Có phiên nằm ngoài phạm vi được phép." });
    expect(m.updated).toEqual([]);
  });

  it("CHU_NHIEM_KHOA kiêm MANG_LUOI_KSNK: đọc toàn viện nên đánh dấu đã xem được phiên ngoài khoa", async () => {
    m.scope = { ...base, roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    const r = await markVSTSessionsSeen([SID]);
    expect(r).toEqual({ success: true });
    expect(m.updated).toEqual([[SID]]);
  });

  it("CHU_NHIEM_KHOA kiêm MANG_LUOI_KSNK chưa gán khoa: vẫn được (không bị «không xác định phạm vi khoa»)", async () => {
    m.scope = {
      ...base,
      roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"],
      isMangLuoiKsnk: true,
      actorKhoaId: null,
      actorNhanSuId: null,
    };
    const r = await markVSTSessionsSeen([SID]);
    expect(r).toEqual({ success: true });
  });

  it("CHU_NHIEM_KHOA đơn: được (không đổi)", async () => {
    m.scope = { ...base, roles: ["CHU_NHIEM_KHOA"], isMangLuoiKsnk: false };
    const r = await markVSTSessionsSeen([SID]);
    expect(r).toEqual({ success: true });
  });

  it("NHAN_VIEN_KSNK kiêm MANG_LUOI_KSNK: được phiên ngoài khoa", async () => {
    m.scope = { ...base, roles: ["NHAN_VIEN_KSNK", "MANG_LUOI_KSNK"], isNhanVienKsnk: true, isMangLuoiKsnk: true };
    expect(await markVSTSessionsSeen([SID])).toEqual({ success: true });
  });

  it("mạng lưới thuần: phiên trong khoa mình vẫn đánh dấu được", async () => {
    m.row = { id: SID, khoa_id: "khoa-minh", nguoi_giam_sat_id: "ns-khac" };
    m.scope = { ...base, roles: ["MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    expect(await markVSTSessionsSeen([SID])).toEqual({ success: true });
    expect(m.updated).toEqual([[SID]]);
  });

  it("KHACH_THONG_KE_GSTT và HOI_DONG_KSNK thuần: bị chặn từ assertVstHistoryAccess, không ghi", async () => {
    for (const roles of [["KHACH_THONG_KE_GSTT"], ["HOI_DONG_KSNK"]]) {
      m.scope = { ...base, roles, isGuestStatsOnly: roles[0] === "KHACH_THONG_KE_GSTT" };
      const r = await markVSTSessionsSeen([SID]);
      expect(r.success).toBe(false);
    }
    expect(m.updated).toEqual([]);
  });
});
