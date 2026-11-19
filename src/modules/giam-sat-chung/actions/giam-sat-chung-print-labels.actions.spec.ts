import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  scope: {} as Record<string, unknown>,
  eqCalls: [] as Array<{ table: string; col: string; val: string }>,
}));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn() }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: async () => m.scope }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: (col: string, val: string) => {
          m.eqCalls.push({ table, col, val });
          return q;
        },
        maybeSingle: async () => ({
          data: { ma_khoa: "K2", ten_khoa: "Khoa 2", ten_khu_vuc: "Khu", ho_ten: `ten-${table}` },
          error: null,
        }),
      };
      return q;
    },
  }),
}));

import { getGscSessionPrintLabels } from "./giam-sat-chung-print-labels.actions";

const KHOA_MINH = "khoa-minh";
const KHOA_KHAC = "khoa-khac";

const base = {
  roles: [] as string[],
  actorNhanSuId: "ns-minh",
  actorKhoaId: KHOA_MINH,
  isAdmin: false,
  isNhanVienKsnk: false,
  isMangLuoiKsnk: false,
  isGuestStatsOnly: false,
};

const input = { khoa_id: KHOA_KHAC, nhan_vien_id: "nv-khac", nguoi_giam_sat_id: "ns-khac" };

function nhanSuKhoaFilters() {
  return m.eqCalls.filter((c) => c.table === "mdm_nhan_su" && c.col === "khoa_id");
}

describe("getGscSessionPrintLabels — phạm vi khoa (VST-038 lát A)", () => {
  beforeEach(() => {
    m.eqCalls = [];
  });

  it("mạng lưới thuần: in nhãn phiên khoa khác bị chặn (fail-closed)", async () => {
    m.scope = { ...base, roles: ["MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    const r = await getGscSessionPrintLabels(input);
    expect(r).toEqual({ success: false, error: "Khoa được yêu cầu nằm ngoài phạm vi được phép." });
  });

  it("mạng lưới thuần: nhân sự khóa theo khoa của mình khi in nhãn phiên khoa mình", async () => {
    m.scope = { ...base, roles: ["MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    const r = await getGscSessionPrintLabels({ ...input, khoa_id: KHOA_MINH });
    expect(r.success).toBe(true);
    expect(nhanSuKhoaFilters()).toEqual([
      { table: "mdm_nhan_su", col: "khoa_id", val: KHOA_MINH },
      { table: "mdm_nhan_su", col: "khoa_id", val: KHOA_MINH },
    ]);
  });

  it("NHAN_VIEN_KSNK kiêm MANG_LUOI_KSNK: in nhãn phiên khoa khác được, nhân sự không bị khóa khoa", async () => {
    m.scope = {
      ...base,
      roles: ["NHAN_VIEN_KSNK", "MANG_LUOI_KSNK"],
      isNhanVienKsnk: true,
      isMangLuoiKsnk: true,
    };
    const r = await getGscSessionPrintLabels(input);
    expect(r.success).toBe(true);
    expect(nhanSuKhoaFilters()).toEqual([]);
  });

  it("ADMIN kiêm MANG_LUOI_KSNK: in nhãn phiên khoa khác được", async () => {
    m.scope = { ...base, roles: ["ADMIN", "MANG_LUOI_KSNK"], isAdmin: true, isMangLuoiKsnk: true };
    const r = await getGscSessionPrintLabels(input);
    expect(r.success).toBe(true);
    expect(nhanSuKhoaFilters()).toEqual([]);
  });

  it("CHU_NHIEM_KHOA kiêm MANG_LUOI_KSNK: đọc phiên toàn viện nên in nhãn khoa khác được (cùng gscSessionVisibleToActor)", async () => {
    m.scope = { ...base, roles: ["CHU_NHIEM_KHOA", "MANG_LUOI_KSNK"], isMangLuoiKsnk: true };
    const r = await getGscSessionPrintLabels(input);
    expect(r.success).toBe(true);
    expect(nhanSuKhoaFilters()).toEqual([]);
  });
});
