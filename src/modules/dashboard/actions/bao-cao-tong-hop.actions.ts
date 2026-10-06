"use server";

import { z } from "zod";
import {
  getGscStrategicAnalytics,
  getGscStrategicKpisOnly,
} from "@/modules/giam-sat-chung/actions/gsc-strategic-analytics.actions";
import { resolveTuanThuBangKiemMas } from "@/modules/giam-sat-chung/lib/resolve-tuan-thu-bang-kiem-mas";
import {
  getVstStrategicAnalytics,
  getVstStrategicKpisOnly,
} from "@/modules/giam-sat-vst/actions/vst-strategic-analytics.actions";
import { getGiamSatNkbvDashboardPayload } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-dashboard.actions";
import { fetchCssdAnalyticsBundle } from "@/modules/cssd-erp/contexts/reporting/analytics";
import { describeCssdKhoaOwnershipProxy } from "@/lib/analytics/cssd-metrics/cssd-analytics-core";
import { veSinhTayHubBangKiemMasForRpc } from "@/lib/domain/gsc-lop-giam-sat-filter";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import {
  verifyBaoCaoTongHopExport,
  verifyBaoCaoTongHopShell,
} from "../lib/dashboard-command-center-access";
import {
  composeBaoCaoTongHopPayload,
  computeTyLeGsc,
  computeTyLeVst,
  shouldFetchSource,
} from "../lib/bao-cao-tong-hop-core";
import { previousEqualLengthPeriod } from "../lib/bao-cao-period-compare";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { NkbvDashboardPayload } from "@/modules/giam-sat-nkbv/lib/nkbv-dashboard-aggregate";
import type {
  BaoCaoChuyenDe,
  BaoCaoCssdAppendix,
  BaoCaoTongHopFilters,
  BaoCaoTongHopPayload,
  SourceLoadStatus,
} from "../types/bao-cao-tong-hop.types";

const filtersSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  khoi_ids: z.array(z.string()).optional(),
  khoa_ids: z.array(z.string()).optional(),
  nghe_nghiep_ids: z.array(z.string()).optional(),
  khu_vuc_ids: z.array(z.string()).optional(),
  hinh_thuc_ids: z.array(z.string()).optional(),
  /** BCTH-03: lens riêng từng khối (mặc định KSNK). */
  hinh_thuc_ids_vst: z.array(z.string()).optional(),
  hinh_thuc_ids_gsc: z.array(z.string()).optional(),
  bang_kiem_mas: z.array(z.string()).optional(),
  chuyen_de: z.enum(["ALL", "VST", "GSC", "NKBV"]).optional(),
});

function mapSourceResult(
  res: { success: true; data: unknown } | { success: false; error: string },
): { status: SourceLoadStatus; data: unknown; error?: string } {
  if (res.success) return { status: "ok", data: res.data };
  const msg = res.error || "";
  if (/permission|quyền|denied|403/i.test(msg)) return { status: "denied", data: null, error: msg };
  return { status: "error", data: null, error: msg };
}

/** BCTH-11: gate in/xuất bản ký — gọi từ client trước khi mở hộp thoại in. */
export async function assertBaoCaoTongHopExport(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await verifyBaoCaoTongHopExport();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Không có quyền xuất/in báo cáo tổng hợp",
    };
  }
}

export async function getBaoCaoTongHopAnalytics(
  filters: BaoCaoTongHopFilters,
): Promise<{ success: true; data: BaoCaoTongHopPayload } | { success: false; error: string }> {
  const parsed = filtersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; ") || "Tham số không hợp lệ",
    };
  }

  await verifyBaoCaoTongHopShell();

  const f = parsed.data;
  const chuyenDe: BaoCaoChuyenDe = f.chuyen_de ?? "ALL";
  const hinhThucVst = f.hinh_thuc_ids_vst ?? f.hinh_thuc_ids;
  const hinhThucGsc = f.hinh_thuc_ids_gsc ?? f.hinh_thuc_ids;
  const baseInput = {
    tu_ngay: f.tu_ngay,
    den_ngay: f.den_ngay,
    khoi_ids: f.khoi_ids,
    khoa_ids: f.khoa_ids,
    nghe_nghiep_ids: f.nghe_nghiep_ids,
    khu_vuc_ids: f.khu_vuc_ids,
  };
  const vstInput = { ...baseInput, hinh_thuc_ids: hinhThucVst };
  const gscInput = {
    ...baseInput,
    hinh_thuc_ids: hinhThucGsc,
    bang_kiem_mas: f.bang_kiem_mas,
  };

  const sources = {
    vst: "skipped" as SourceLoadStatus,
    gsc: "skipped" as SourceLoadStatus,
    nkbv: "skipped" as SourceLoadStatus,
    cssd: "skipped" as SourceLoadStatus,
  };
  const errors: { vst?: string; gsc?: string; nkbv?: string; cssd?: string } = {};

  let vst: VstStrategicPayload | null = null;
  let gsc: GscStrategicPayload | null = null;
  let gscVeSinhTay: GscStrategicPayload | null = null;
  let nkbv: NkbvDashboardPayload | null = null;
  let cssd: BaoCaoCssdAppendix | null = null;

  // Tra TUAN_THU 1 lần khi BCTH cần GSC generic (hiện tại và/hoặc kỳ trước) và chưa có lọc BK.
  const needGscGeneric =
    shouldFetchSource(chuyenDe, "GSC") && !(f.bang_kiem_mas && f.bang_kiem_mas.length > 0);
  let gscOpts: { resolvedTuanThuBangKiemMas?: string[] | null } | undefined;
  if (needGscGeneric) {
    const supabase = await createServerSupabaseUserClient();
    const resolved = await resolveTuanThuBangKiemMas(supabase);
    if (!resolved.success) {
      sources.gsc = "error";
      errors.gsc = resolved.error;
    } else {
      gscOpts = { resolvedTuanThuBangKiemMas: resolved.mas };
    }
  }

  const tasks: Promise<void>[] = [];

  if (shouldFetchSource(chuyenDe, "VST")) {
    tasks.push(
      getVstStrategicAnalytics(vstInput).then((res) => {
        const mapped = mapSourceResult(res);
        sources.vst = mapped.status;
        if (mapped.error) errors.vst = mapped.error;
        if (res.success) vst = res.data;
      }),
    );
  }

  if (shouldFetchSource(chuyenDe, "GSC") && !errors.gsc) {
    tasks.push(
      getGscStrategicAnalytics(gscInput, gscOpts).then((res) => {
        const mapped = mapSourceResult(res);
        sources.gsc = mapped.status;
        if (mapped.error) errors.gsc = mapped.error;
        if (res.success) gsc = res.data;
      }),
    );
  }

  // BCTH-01: BM.02/03 luôn tải riêng — không phụ thuộc lọc BK GSC.
  if (shouldFetchSource(chuyenDe, "VST") || shouldFetchSource(chuyenDe, "GSC")) {
    tasks.push(
      getGscStrategicAnalytics({
        ...baseInput,
        hinh_thuc_ids: hinhThucVst,
        bang_kiem_mas: veSinhTayHubBangKiemMasForRpc(),
        exclude_vst_hub_bang_kiem: false,
      }).then((res) => {
        if (res.success) gscVeSinhTay = res.data;
      }),
    );
  }

  if (shouldFetchSource(chuyenDe, "NKBV")) {
    tasks.push(
      getGiamSatNkbvDashboardPayload({
        tu_ngay: f.tu_ngay,
        den_ngay: f.den_ngay,
        khoa_ghi_nhan_ids: f.khoa_ids,
        include_rates: false,
      }).then((res) => {
        const mapped = mapSourceResult(res);
        sources.nkbv = mapped.status;
        if (mapped.error) errors.nkbv = mapped.error;
        if (res.success) nkbv = res.data;
      }),
    );
  }

  // CSSD phụ lục — luôn cố gắng tải khi chuyên đề ALL (không đổi CCS). Soft-fail.
  if (chuyenDe === "ALL") {
    tasks.push(
      fetchCssdAnalyticsBundle({ from: f.tu_ngay, to: f.den_ngay, station: "ALL" }).then((res) => {
        if (!res.success) {
          sources.cssd = /permission|quyền|denied|403/i.test(res.error) ? "denied" : "error";
          errors.cssd = res.error;
          return;
        }
        sources.cssd = "ok";
        const b = res.data.brief;
        const ownership = describeCssdKhoaOwnershipProxy(res.data.boByKhoa, 5);
        cssd = {
          san_luong_cap_phat: b.san_luong_cap_phat,
          tong_hoan_thanh_tram: b.tong_hoan_thanh_tram,
          ty_le_quy_trinh_khong_su_co: b.ty_le_quy_trinh_khong_su_co,
          so_bo_danh_muc: b.so_bo_danh_muc,
          so_me_ky: b.so_me_ky,
          ty_le_qc_dat_me: b.ty_le_qc_dat_me,
          may_ready: b.may_ready,
          may_repairing: b.may_repairing,
          station_volume: res.data.stationVolume.map((s) => ({
            station: s.station,
            label: s.label,
            completed: s.completed,
          })),
          khoa_ownership_proxy: {
            disclaimer: ownership.disclaimer,
            top: ownership.top,
          },
        };
      }),
    );
  }

  // Kỳ trước cùng độ dài — chỉ KPI (soft-fail).
  let kyTruoc:
    | {
        tu_ngay: string;
        den_ngay: string;
        ty_le_vst: number | null;
        ty_le_gsc: number | null;
      }
    | null = null;
  const priorBounds = previousEqualLengthPeriod(f.tu_ngay, f.den_ngay);
  if (priorBounds && (shouldFetchSource(chuyenDe, "VST") || shouldFetchSource(chuyenDe, "GSC"))) {
    const priorVstInput = {
      ...vstInput,
      tu_ngay: priorBounds.tu_ngay,
      den_ngay: priorBounds.den_ngay,
    };
    const priorGscInput = {
      ...gscInput,
      tu_ngay: priorBounds.tu_ngay,
      den_ngay: priorBounds.den_ngay,
    };
    tasks.push(
      (async () => {
        const [priorVst, priorGsc] = await Promise.all([
          shouldFetchSource(chuyenDe, "VST")
            ? getVstStrategicKpisOnly(priorVstInput)
            : Promise.resolve(null),
          shouldFetchSource(chuyenDe, "GSC") && !errors.gsc
            ? getGscStrategicKpisOnly(priorGscInput, gscOpts)
            : Promise.resolve(null),
        ]);
        const priorVstPct =
          priorVst && priorVst.success ? computeTyLeVst(priorVst.data.kpis) : null;
        const priorGscPct =
          priorGsc && priorGsc.success ? computeTyLeGsc(priorGsc.data.kpis) : null;
        if (priorVstPct != null || priorGscPct != null) {
          kyTruoc = {
            tu_ngay: priorBounds.tu_ngay,
            den_ngay: priorBounds.den_ngay,
            ty_le_vst: priorVstPct,
            ty_le_gsc: priorGscPct,
          };
        }
      })(),
    );
  }

  await Promise.all(tasks);

  const payload = composeBaoCaoTongHopPayload({
    filters: { ...f, chuyen_de: chuyenDe },
    vst,
    gsc,
    gscVeSinhTay,
    nkbv,
    cssd,
    sources,
    errors,
    kyTruoc,
  });

  const anyOk =
    sources.vst === "ok" || sources.gsc === "ok" || sources.nkbv === "ok" || sources.cssd === "ok";
  if (!anyOk) {
    return {
      success: false,
      error:
        errors.vst ||
        errors.gsc ||
        errors.nkbv ||
        errors.cssd ||
        "Không tải được dữ liệu từ các nguồn trong phạm vi quyền của bạn",
    };
  }

  return { success: true, data: payload };
}
