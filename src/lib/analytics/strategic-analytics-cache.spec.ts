import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeTyLeGsc, computeTyLeVst } from "@/lib/analytics/supervision-metrics";
import { normalizeGscStrategicPercents } from "@/lib/analytics/gsc-analytics-data";
import { normalizeVstStrategicPercents } from "@/lib/analytics/vst-analytics-data";

const rpcCalls: string[] = [];

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(async (name: string) => {
    rpcCalls.push(name);
    if (name.includes("vst_strategic")) {
      return {
        data: {
          kpis: {
            tong_phien: 1,
            tong_co_hoi: 100,
            da_tuan_thu: 85,
            bo_sot: 15,
            loi_ky_thuat: 0,
            loi_thoi_gian: 0,
            lam_dung_gang: 0,
            dung_ky_thuat: 0,
            du_thoi_gian: 0,
            ty_le_tuan_thu: 0.85,
            ty_le_dung_ky_thuat: null,
            ty_le_du_thoi_gian: null,
            ty_le_lam_dung_gang: null,
          },
          trendline: [],
          matrix_khoa: [],
          matrix_nghe: [],
          moments: [],
          gap_analysis: [],
          workload: {
            khoa_tu_giam_sat: 0,
            khoa_duoc_ksnk_giam_sat: 0,
            ksnk_so_co_hoi: 0,
            ksnk_so_phien: 0,
            co_cau_giam_sat: [],
          },
        },
        error: null,
      };
    }
    if (name.includes("gsc_strategic")) {
      return {
        data: {
          kpis: {
            tong_phien: 1,
            tong_quan_sat: 50,
            tong_dat: 40,
            tong_vi_pham: 10,
            ty_le_tuan_thu: 0.8,
          },
          trendline: [],
          matrix_khoa: [],
          top_violations: [],
          gap_analysis: [],
          dynamic_checklists: [],
          workload: {
            khoa_tu_giam_sat: 0,
            khoa_duoc_ksnk_giam_sat: 0,
            chuyen_de_duoc_ksnk_phu: 0,
            ksnk_so_phien: 0,
            co_cau_giam_sat: [],
          },
        },
        error: null,
      };
    }
    if (name.includes("compare_matrices")) {
      return {
        data: {
          matrix_khoi: [],
          matrix_khu_vuc: [],
          matrix_hinh_thuc: [],
        },
        error: null,
      };
    }
    return { data: null, error: { message: `unexpected rpc ${name}` } };
  }),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({ rpc: mocks.rpc }),
}));

import {
  getCachedGscStrategicKpisOnly,
  getCachedGscStrategicRpc,
  getCachedVstStrategicKpisOnly,
  getCachedVstStrategicRpc,
} from "./strategic-analytics-cache";

const lensArgs = {
  p_tu_ngay: "2026-09-01",
  p_den_ngay: "2026-09-30",
  p_khoi_ids: null,
  p_khoa_ids: null,
  p_nghe_nghiep_ids: null,
  p_khu_vuc_ids: null,
  p_hinh_thuc_ids: ["KSNK"],
};

describe("strategic-analytics-cache BCTH KPI-only", () => {
  beforeEach(() => {
    rpcCalls.length = 0;
    mocks.rpc.mockClear();
  });

  it("mô phỏng tải BCTH ALL/KSNK: 14 strategic/matrices, kỳ trước chỉ strategic_impl", async () => {
    await getCachedVstStrategicRpc(lensArgs);
    await getCachedGscStrategicRpc({ ...lensArgs, p_bang_kiem_mas: ["BK.01"] });
    await getCachedGscStrategicRpc({ ...lensArgs, p_bang_kiem_mas: ["BM.02"] });
    await getCachedVstStrategicKpisOnly({
      ...lensArgs,
      p_tu_ngay: "2026-08-02",
      p_den_ngay: "2026-08-31",
    });
    await getCachedGscStrategicKpisOnly({
      ...lensArgs,
      p_tu_ngay: "2026-08-02",
      p_den_ngay: "2026-08-31",
      p_bang_kiem_mas: ["BK.01"],
    });

    const strategic = rpcCalls.filter((n) => n.includes("strategic_analytics_impl"));
    const matrices = rpcCalls.filter((n) => n.includes("compare_matrices_impl"));
    expect(strategic.length + matrices.length).toBe(14);
    expect(strategic).toHaveLength(8); // 3 current (+3 gap) + 2 prior
    expect(matrices).toHaveLength(6); // 3 current (+3 gap), không có prior

    const priorCalls = rpcCalls.filter((_, i) => {
      const call = mocks.rpc.mock.calls[i] as unknown as [string, { p_tu_ngay?: string }?];
      return call?.[1]?.p_tu_ngay === "2026-08-02";
    });
    expect(priorCalls).toEqual([
      "rpc_dashboard_vst_strategic_analytics_impl",
      "rpc_dashboard_gsc_strategic_analytics_impl",
    ]);
    expect(priorCalls.some((n) => n.includes("compare_matrices"))).toBe(false);
  });

  it("KPI kỳ trước qua đường kpis-only == normalize + computeTyLe (kể cả ty_le 0–1)", async () => {
    const vstOnly = await getCachedVstStrategicKpisOnly(lensArgs);
    expect(vstOnly.success).toBe(true);
    if (!vstOnly.success) return;
    const rawVst = {
      kpis: {
        tong_phien: 1,
        tong_co_hoi: 100,
        da_tuan_thu: 85,
        bo_sot: 15,
        loi_ky_thuat: 0,
        loi_thoi_gian: 0,
        lam_dung_gang: 0,
        dung_ky_thuat: 0,
        du_thoi_gian: 0,
        ty_le_tuan_thu: 0.85 as number | null,
        ty_le_dung_ky_thuat: null,
        ty_le_du_thoi_gian: null,
        ty_le_lam_dung_gang: null,
      },
      trendline: [],
      matrix_khoa: [],
      matrix_nghe: [],
      moments: [],
      gap_analysis: [],
      workload: {
        khoa_tu_giam_sat: 0,
        khoa_duoc_ksnk_giam_sat: 0,
        ksnk_so_co_hoi: 0,
        ksnk_so_phien: 0,
        co_cau_giam_sat: [],
      },
    };
    const oldPath = computeTyLeVst(normalizeVstStrategicPercents(rawVst).kpis);
    expect(computeTyLeVst(vstOnly.data.kpis)).toBe(oldPath);
    expect(oldPath).toBe(85);

    const gscOnly = await getCachedGscStrategicKpisOnly({ ...lensArgs, p_bang_kiem_mas: ["BK.01"] });
    expect(gscOnly.success).toBe(true);
    if (!gscOnly.success) return;
    const rawGsc = {
      kpis: {
        tong_phien: 1,
        tong_quan_sat: 50,
        tong_dat: 40,
        tong_vi_pham: 10,
        ty_le_tuan_thu: 0.8,
      },
      trendline: [],
      matrix_khoa: [],
      top_violations: [],
      gap_analysis: [],
      dynamic_checklists: [],
      workload: {
        khoa_tu_giam_sat: 0,
        khoa_duoc_ksnk_giam_sat: 0,
        chuyen_de_duoc_ksnk_phu: 0,
        ksnk_so_phien: 0,
        co_cau_giam_sat: [],
      },
    };
    const oldGsc = computeTyLeGsc(normalizeGscStrategicPercents(rawGsc).kpis);
    expect(computeTyLeGsc(gscOnly.data.kpis)).toBe(oldGsc);
    expect(oldGsc).toBe(80);
  });
});
