"use server";

import { format, parseISO } from "date-fns";
import { bv103DefaultTuNgayFromDenIso } from "@/lib/bv103-analytics-default-range";
import { getCachedDmKhoaPhongAll, getCachedDmKhoiKhoa } from "@/lib/cache/master-data-cache";
import {
  aggregateRateRowsByKhoi,
  hydrateByKhoaRowIds,
} from "@/modules/dashboard/lib/aggregate-rate-rows-by-khoi";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { createSupabaseVstDashboardRpcAdapter } from "../adapters/supabase-vst-dashboard-rpc.adapter";
import { verifyPermission } from "@/lib/server-permission";
import { verifyCommandCenterShell } from "@/modules/dashboard/lib/dashboard-command-center-access";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import type { VstDashboardPayload, VstDashboardFilters } from "./vst-dashboard.types";

/** jsonb array từ PostgREST đôi khi là string hoặc object — chuẩn hóa về mảng hàng. */
function parseMomentTableRpc(raw: unknown): VstDashboardPayload["by_moment_table"] | null {
  if (raw == null) return null;
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  if (Array.isArray(v)) return v as VstDashboardPayload["by_moment_table"];
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    const vals = Object.values(v as Record<string, unknown>);
    if (
      vals.length > 0 &&
      vals.every((x) => x != null && typeof x === "object" && !Array.isArray(x))
    ) {
      return vals as VstDashboardPayload["by_moment_table"];
    }
  }
  return null;
}

/** Bổ sung n_dat = tong - n_bo_sot khi payload cũ thiếu cột (tránh bảng tuân thủ toàn 0). */
function coerceByMomentTableRows(
  rows: VstDashboardPayload["by_moment_table"] | undefined
): NonNullable<VstDashboardPayload["by_moment_table"]> {
  if (!rows?.length) return rows ?? [];
  return rows.map((r) => {
    const tong = Number(r.tong) || 0;
    const nBoSot = Number(r.n_bo_sot) || 0;
    const rawNd = (r as { n_dat?: unknown }).n_dat;
    let nDat = Number(rawNd);
    if (rawNd === undefined || !Number.isFinite(nDat)) {
      nDat = Math.max(0, tong - nBoSot);
    }
    return { ...r, tong, n_bo_sot: nBoSot, n_dat: nDat };
  });
}

/** Toàn bộ khoa (kể cả inactive) để nối ten → id → khoi_id khi RPC thiếu id trên by_khoa. */
async function fetchDmKhoaPhongForKhoiAggregation(): Promise<
  Array<{ id: string; ten_khoa: string | null; khoi_id: string | null }>
> {
  return getCachedDmKhoaPhongAll();
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function assertOptionalIsoDay(value: string | undefined, field: string): void {
  const s = value?.trim();
  if (s && !ISO_DAY.test(s)) throw new Error(`${field} phải dạng YYYY-MM-DD`);
}

export async function getVstDashboardPayload(filters: VstDashboardFilters = {}) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "view");
    await verifyCommandCenterShell();
    const scope = await getActorKsnkScope();

    assertOptionalIsoDay(filters.tu_ngay, "tu_ngay");
    assertOptionalIsoDay(filters.den_ngay, "den_ngay");

    const denStr = filters.den_ngay?.trim() || format(new Date(), "yyyy-MM-dd");
    let tuStr = filters.tu_ngay?.trim() || bv103DefaultTuNgayFromDenIso(denStr);
    if (parseISO(tuStr) > parseISO(denStr)) tuStr = bv103DefaultTuNgayFromDenIso(denStr);

    const khoaIds = (filters.khoa_ids || [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    
    if (filters.khoa_id?.trim()) khoaIds.push(filters.khoa_id.trim());

    const khoiIds = (filters.khoi_ids || []).filter(Boolean);
    const ngheIds = (filters.nghe_nghiep_ids || []).filter(Boolean);
    const khuIds = (filters.khu_vuc_ids || []).filter(Boolean);

    if (scope.isMangLuoiKsnk) {
      // Mạng lưới chỉ xem theo khoa của chính họ.
      if (!scope.actorKhoaId) {
        return {
          success: true as const,
          data: {
            tu_ngay: tuStr,
            den_ngay: denStr,
            kpis: { tong_phien: 0, tong_co_hoi: 0, da_tuan_thu: 0, bo_sot: 0, ty_le_tuan_thu: 0 },
            trend: [],
            by_khoa: [],
            by_khoi: [],
            by_doi_tuong: [],
            by_khu_vuc: [],
            moment_missed: [],
            glove_abuse_by_moment: [],
            supervision_sources: [],
            participation: [],
            error_breakdown: {
              loi_ky_thuat: 0,
              loi_thoi_gian: 0,
              lam_dung_gang: 0,
              ty_le_lam_dung_gang: 0,
              ty_le_dung_ky_thuat: 0,
              ty_le_du_thoi_gian: 0,
            },
          },
        };
      }

      khoaIds.splice(0, khoaIds.length, scope.actorKhoaId);
      // Clear các filter chiều sâu để tránh RPC tính theo các chiều khác gây sai phạm.
      khoiIds.splice(0, khoiIds.length);
      ngheIds.splice(0, ngheIds.length);
      khuIds.splice(0, khuIds.length);
    }

    const rpcArgs = {
      p_tu_ngay: tuStr,
      p_den_ngay: denStr,
      p_khoi_ids: khoiIds.length > 0 ? khoiIds : null,
      p_khoa_ids: khoaIds.length > 0 ? khoaIds : null,
      p_nghe_nghiep_ids: ngheIds.length > 0 ? ngheIds : null,
      p_khu_vuc_ids: khuIds.length > 0 ? khuIds : null,
      p_trend_type: filters.trend_type || "month",
      p_supervision_type: filters.supervision_type || "ALL",
    };

    const vstRpc = createSupabaseVstDashboardRpcAdapter(supabase);
    const { dashData, momentData, momentError } = await vstRpc.fetchRaw(filters, rpcArgs);

    const payload = (dashData ?? {}) as Partial<VstDashboardPayload>;

    const fromMoment = parseMomentTableRpc(momentData);
    let byMomentTable: VstDashboardPayload["by_moment_table"] = coerceByMomentTableRows(
      (payload.by_moment_table ?? []) as VstDashboardPayload["by_moment_table"]
    );
    if (!momentError && fromMoment !== null) {
      byMomentTable = coerceByMomentTableRows(fromMoment);
    } else if (process.env.NODE_ENV === "development" && momentError) {
      console.warn("[VST] rpc_get_vst_moment_table_only:", momentError.message);
    }
    const kpis = payload.kpis ?? { tong_phien: 0, tong_co_hoi: 0, da_tuan_thu: 0, bo_sot: 0, ty_le_tuan_thu: 0 };
    const rawErr =
      payload.error_breakdown ?? {
        loi_ky_thuat: 0,
        loi_thoi_gian: 0,
        lam_dung_gang: 0,
        ty_le_lam_dung_gang: 0,
        ty_le_dung_ky_thuat: 0,
        ty_le_du_thoi_gian: 0,
      };
    const boSot = kpis.bo_sot ?? 0;
    const lamDungGang = rawErr.lam_dung_gang ?? 0;
    const tyLeLamDungGangChuan =
      boSot > 0 ? Math.round((lamDungGang * 1000) / boSot) / 10 : 0;

    let by_khoi = payload.by_khoi ?? [];
    let by_khoaOut = payload.by_khoa ?? [];
    if ((!by_khoi || by_khoi.length === 0) && by_khoaOut.length > 0) {
      try {
        const [khoaRows, khoiRows] = await Promise.all([
          fetchDmKhoaPhongForKhoiAggregation(),
          getCachedDmKhoiKhoa(),
        ]);
        const hydrated = hydrateByKhoaRowIds(by_khoaOut, khoaRows);
        by_khoaOut = hydrated;
        const khoaCatalog = khoaRows.map((r) => ({
          id: String(r.id),
          khoi_id: r.khoi_id ? String(r.khoi_id) : "",
        }));
        const khoiCatalog = khoiRows.map((r) => ({
          id: String(r.id),
          label: String(r.ten_khoi || "—"),
        }));
        const merged = aggregateRateRowsByKhoi(hydrated, khoaCatalog, khoiCatalog);
        if (merged.length > 0) by_khoi = merged;
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[VST] by_khoi: không gộp được từ DM:", e);
        }
      }
    }

    return {
      success: true as const,
      data: {
        tu_ngay: payload.tu_ngay ?? tuStr,
        den_ngay: payload.den_ngay ?? denStr,
        kpis,
        trend: payload.trend ?? [],
        by_khoa: by_khoaOut,
        by_khoi,
        by_doi_tuong: payload.by_doi_tuong ?? [],
        by_khu_vuc: payload.by_khu_vuc ?? [],
        moment_missed: payload.moment_missed ?? [],
        glove_abuse_by_moment: payload.glove_abuse_by_moment ?? [],
        supervision_sources: payload.supervision_sources ?? [],
        participation: payload.participation ?? [],
        by_moment_table: byMomentTable,
        error_breakdown: { ...rawErr, ty_le_lam_dung_gang: tyLeLamDungGangChuan },
      },
    };
  } catch (e: unknown) {
    console.error("[VST DASHBOARD ERROR]", e);
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
