import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyShell: vi.fn(async () => undefined),
  resolveTuanThu: vi.fn(async () => ({ success: true as const, mas: ["BK.01", "KSNK.QT.07.BM.02"] })),
  getVst: vi.fn(async () => ({
    success: true as const,
    data: { kpis: { tong_co_hoi: 10, da_tuan_thu: 8, ty_le_tuan_thu: 80 } },
  })),
  getVstKpis: vi.fn(async () => ({
    success: true as const,
    data: { kpis: { tong_co_hoi: 10, da_tuan_thu: 7, ty_le_tuan_thu: 70 } },
  })),
  getGsc: vi.fn(async () => ({
    success: true as const,
    data: { kpis: { tong_quan_sat: 20, tong_dat: 16, ty_le_tuan_thu: 80 } },
  })),
  getGscKpis: vi.fn(async () => ({
    success: true as const,
    data: { kpis: { tong_quan_sat: 20, tong_dat: 14, ty_le_tuan_thu: 70 } },
  })),
  getNkbv: vi.fn(async () => ({
    success: true as const,
    data: { kpis: {}, by_loai: [], monthly: [], epidemiologyRates: [] },
  })),
  fetchCssd: vi.fn(async () => ({
    success: true as const,
    data: {
      brief: {
        san_luong_cap_phat: 0,
        tong_hoan_thanh_tram: 0,
        ty_le_quy_trinh_khong_su_co: null,
        so_bo_danh_muc: 0,
        so_me_ky: 0,
        ty_le_qc_dat_me: null,
        may_ready: 0,
        may_repairing: 0,
      },
      stationVolume: [],
      boByKhoa: [],
    },
  })),
  createUserClient: vi.fn(async () => ({})),
  getScope: vi.fn(async (): Promise<{ isAdmin: boolean; isNhanVienKsnk: boolean; isMangLuoiKsnk: boolean; actorKhoaId: string | null }> => ({ isAdmin: true, isNhanVienKsnk: true, isMangLuoiKsnk: false, actorKhoaId: null })),
  verifyPerm: vi.fn(async () => undefined),
  thongKe: vi.fn(async () => ({ stats: {}, insights: [] })),
}));

vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: mocks.getScope }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPerm }));
vi.mock("@/modules/chat-thai-do-vai/actions/chat-thai-do-vai.actions", () => ({
  getThongKeKyAction: mocks.thongKe,
}));

vi.mock("../lib/dashboard-command-center-access", () => ({
  verifyBaoCaoTongHopShell: mocks.verifyShell,
  verifyBaoCaoTongHopExport: vi.fn(),
}));

vi.mock("@/modules/giam-sat-chung/lib/resolve-tuan-thu-bang-kiem-mas", () => ({
  resolveTuanThuBangKiemMas: mocks.resolveTuanThu,
}));

vi.mock("@/modules/giam-sat-vst/actions/vst-strategic-analytics.actions", () => ({
  getVstStrategicAnalytics: mocks.getVst,
  getVstStrategicKpisOnly: mocks.getVstKpis,
}));

vi.mock("@/modules/giam-sat-chung/actions/gsc-strategic-analytics.actions", () => ({
  getGscStrategicAnalytics: mocks.getGsc,
  getGscStrategicKpisOnly: mocks.getGscKpis,
}));

vi.mock("@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-dashboard.actions", () => ({
  getGiamSatNkbvDashboardPayload: mocks.getNkbv,
}));

vi.mock("@/modules/cssd-erp/contexts/reporting/analytics", () => ({
  fetchCssdAnalyticsBundle: mocks.fetchCssd,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: mocks.createUserClient,
}));

vi.mock("../lib/bao-cao-tong-hop-core", async () => {
  const actual = await vi.importActual<typeof import("../lib/bao-cao-tong-hop-core")>(
    "../lib/bao-cao-tong-hop-core",
  );
  return {
    ...actual,
    composeBaoCaoTongHopPayload: vi.fn((args: unknown) => args),
  };
});

import { getBaoCaoTongHopAnalytics } from "./bao-cao-tong-hop.actions";

describe("getBaoCaoTongHopAnalytics RPC wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveTuanThu.mockResolvedValue({
      success: true as const,
      mas: ["BK.01", "KSNK.QT.07.BM.02"],
    });
  });

  it("ALL + lens KSNK: kỳ trước dùng KPI-only, TUAN_THU 1 lần, NKBV không rates", async () => {
    const res = await getBaoCaoTongHopAnalytics({
      tu_ngay: "2026-09-01",
      den_ngay: "2026-09-30",
      chuyen_de: "ALL",
      hinh_thuc_ids_vst: ["KSNK"],
      hinh_thuc_ids_gsc: ["KSNK"],
    });
    expect(res.success).toBe(true);

    expect(mocks.resolveTuanThu).toHaveBeenCalledTimes(1);

    expect(mocks.getVst).toHaveBeenCalledTimes(1);
    const vstCalls = mocks.getVst.mock.calls as unknown as Array<[{ tu_ngay: string }]>;
    expect(vstCalls[0]?.[0].tu_ngay).toBe("2026-09-01");
    expect(mocks.getVstKpis).toHaveBeenCalledTimes(1);
    const vstKpisCalls = mocks.getVstKpis.mock.calls as unknown as Array<[{ tu_ngay: string }]>;
    expect(vstKpisCalls[0]?.[0].tu_ngay).toBe("2026-08-02");

    // GSC hiện tại + hub BM.02/03
    expect(mocks.getGsc).toHaveBeenCalledTimes(2);
    expect(mocks.getGscKpis).toHaveBeenCalledTimes(1);
    type GscCall = [
      { tu_ngay: string; bang_kiem_mas?: string[] },
      { resolvedTuanThuBangKiemMas?: string[] | null }?,
    ];
    const gscCalls = mocks.getGsc.mock.calls as unknown as GscCall[];
    const gscKpisCalls = mocks.getGscKpis.mock.calls as unknown as GscCall[];
    expect(gscKpisCalls[0]?.[0].tu_ngay).toBe("2026-08-02");
    const gscWithPrefetch = gscCalls.find(
      (c) => c[1] && "resolvedTuanThuBangKiemMas" in c[1],
    );
    expect(gscWithPrefetch?.[1]).toEqual({
      resolvedTuanThuBangKiemMas: ["BK.01", "KSNK.QT.07.BM.02"],
    });
    expect(gscKpisCalls[0]?.[1]).toEqual({
      resolvedTuanThuBangKiemMas: ["BK.01", "KSNK.QT.07.BM.02"],
    });
    // Hub BM.02/03: có bang_kiem_mas sẵn, không truyền prefetch
    const hubCall = gscCalls.find(
      (c) => Array.isArray(c[0]?.bang_kiem_mas) && c[0].bang_kiem_mas.length > 0,
    );
    expect(hubCall?.[1]).toBeUndefined();

    expect(mocks.getNkbv).toHaveBeenCalledWith(
      expect.objectContaining({ include_rates: false }),
    );
  });

  const range = { tu_ngay: "2026-09-01", den_ngay: "2026-09-30", chuyen_de: "ALL" as const };

  it("tài khoản mạng lưới khóa khoa: NKBV dùng effectiveKhoaIds, phụ lục chất thải bị từ chối", async () => {
    mocks.getScope.mockResolvedValueOnce({
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: true,
      actorKhoaId: "khoa-A",
    });
    const res = await getBaoCaoTongHopAnalytics({ ...range, khoa_ids: ["khoa-B"] });
    expect(res.success).toBe(true);
    expect(mocks.getNkbv).toHaveBeenCalledWith(expect.objectContaining({ khoa_ghi_nhan_ids: ["khoa-A"] }));
    expect(mocks.thongKe).not.toHaveBeenCalled();
    const p = (res as unknown as { data: { sources: { chat_thai_do_vai: string } } }).data;
    expect(p.sources.chat_thai_do_vai).toBe("denied");
  });

  it("thiếu quyền HAU_CAN_MOI_TRUONG: phụ lục denied, không gọi thống kê", async () => {
    mocks.verifyPerm.mockRejectedValueOnce(new Error("Bạn không có quyền"));
    const res = await getBaoCaoTongHopAnalytics(range);
    expect(mocks.thongKe).not.toHaveBeenCalled();
    const p = (res as unknown as { data: { sources: { chat_thai_do_vai: string } } }).data;
    expect(p.sources.chat_thai_do_vai).toBe("denied");
  });

  it("nhánh BM.02/03 lỗi: ghi vào errors.gsc, không nuốt", async () => {
    mocks.getGsc.mockResolvedValueOnce({ success: true as const, data: { kpis: {} } } as never);
    mocks.getGsc.mockResolvedValueOnce({ success: false as const, error: "boom" } as never);
    const res = await getBaoCaoTongHopAnalytics(range);
    const p = (res as unknown as { data: { errors: { gsc?: string } } }).data;
    expect(p.errors.gsc).toMatch(/BM\.02\/03: boom/);
  });
});
