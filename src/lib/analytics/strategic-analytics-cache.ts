import { revalidateTag, unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { normalizeVstStrategicPercents } from "@/lib/analytics/vst-analytics-data";
import { normalizeGscStrategicPercents } from "@/lib/analytics/gsc-analytics-data";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

export const VST_STRATEGIC_CACHE_TAG = "vst-strategic-analytics";
export const GSC_STRATEGIC_CACHE_TAG = "gsc-strategic-analytics";
export const GSC_TGS_HITS_CACHE_TAG = "gsc-tgs-session-hits";

const REVALIDATE_SEC = 90;

export function invalidateStrategicAnalyticsCaches() {
  revalidateTag(VST_STRATEGIC_CACHE_TAG, "default");
  revalidateTag(GSC_STRATEGIC_CACHE_TAG, "default");
  revalidateTag(GSC_TGS_HITS_CACHE_TAG, "default");
}

export function invalidateVstStrategicAnalyticsCache() {
  revalidateTag(VST_STRATEGIC_CACHE_TAG, "default");
}

export function invalidateGscStrategicAnalyticsCache() {
  revalidateTag(GSC_STRATEGIC_CACHE_TAG, "default");
  revalidateTag(GSC_TGS_HITS_CACHE_TAG, "default");
}

type RpcArgs = Record<string, unknown>;

function hasHinhThucLensFilter(rpcArgs: RpcArgs): boolean {
  const ids = rpcArgs.p_hinh_thuc_ids;
  return Array.isArray(ids) && ids.length > 0;
}

/** Cache ngắn RPC cặp dashboard VST (đã verifyPermission bên ngoài). */
function fetchCachedVstStrategicRpcRaw(rpcArgs: RpcArgs) {
  const key = JSON.stringify(rpcArgs);
  return unstable_cache(
    async () => {
      // service_role: gọi *_impl (wrapper yêu cầu auth.uid()).
      const supabase = createAdminSupabaseClient();
      const [{ data, error }, { data: matrices, error: matrixErr }] = await Promise.all([
        supabase.rpc("rpc_dashboard_vst_strategic_analytics_impl", rpcArgs),
        supabase.rpc("rpc_vst_compare_matrices_impl", rpcArgs),
      ]);
      if (error) return { success: false as const, error: error.message };
      if (matrixErr) return { success: false as const, error: matrixErr.message };
      const merged = {
        ...(data as VstStrategicPayload),
        ...(matrices as Record<string, unknown>),
      } as VstStrategicPayload;
      return { success: true as const, data: normalizeVstStrategicPercents(merged) };
    },
    [VST_STRATEGIC_CACHE_TAG, key],
    { revalidate: REVALIDATE_SEC, tags: [VST_STRATEGIC_CACHE_TAG] },
  )();
}

/**
 * KPI/trend/matrix theo lens (`p_hinh_thuc_ids`); đối soát (`gap_analysis`) luôn đọc cả 2 lens.
 * Cache key gồm lens (qua JSON rpcArgs) — PERF-2 TTL 90s.
 */
export async function getCachedVstStrategicRpc(rpcArgs: RpcArgs) {
  const main = await fetchCachedVstStrategicRpcRaw(rpcArgs);
  if (!main.success || !hasHinhThucLensFilter(rpcArgs)) return main;
  const gapRes = await fetchCachedVstStrategicRpcRaw({ ...rpcArgs, p_hinh_thuc_ids: null });
  if (!gapRes.success) return main;
  return {
    success: true as const,
    data: { ...main.data, gap_analysis: gapRes.data.gap_analysis },
  };
}

/**
 * Chỉ KPI kỳ trước (BCTH): 1× strategic_impl — không matrices, không lượt gap.
 * Tag invalidate giữ VST_STRATEGIC_CACHE_TAG; key khác cặp full.
 */
export function getCachedVstStrategicKpisOnly(rpcArgs: RpcArgs) {
  const key = JSON.stringify(rpcArgs);
  return unstable_cache(
    async () => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.rpc("rpc_dashboard_vst_strategic_analytics_impl", rpcArgs);
      if (error) return { success: false as const, error: error.message };
      return {
        success: true as const,
        data: normalizeVstStrategicPercents(data as VstStrategicPayload),
      };
    },
    [VST_STRATEGIC_CACHE_TAG, "kpis-only", key],
    { revalidate: REVALIDATE_SEC, tags: [VST_STRATEGIC_CACHE_TAG] },
  )();
}

/** Cache ngắn RPC cặp dashboard GSC (đã verifyPermission bên ngoài). */
function fetchCachedGscStrategicRpcRaw(rpcArgs: RpcArgs) {
  const key = JSON.stringify(rpcArgs);
  return unstable_cache(
    async () => {
      // service_role: gọi *_impl (wrapper yêu cầu auth.uid()).
      const supabase = createAdminSupabaseClient();
      const [{ data, error }, { data: matrices, error: matrixErr }] = await Promise.all([
        supabase.rpc("rpc_dashboard_gsc_strategic_analytics_impl", rpcArgs),
        supabase.rpc("rpc_gsc_compare_matrices_impl", rpcArgs),
      ]);
      if (error) return { success: false as const, error: error.message };
      if (matrixErr) return { success: false as const, error: matrixErr.message };
      const merged = {
        ...(data as GscStrategicPayload),
        ...(matrices as Record<string, unknown>),
      } as GscStrategicPayload;
      return { success: true as const, data: normalizeGscStrategicPercents(merged) };
    },
    [GSC_STRATEGIC_CACHE_TAG, key],
    { revalidate: REVALIDATE_SEC, tags: [GSC_STRATEGIC_CACHE_TAG] },
  )();
}

/** KPI/trend/matrix theo lens; `gap_analysis` giữ cả 2 lens. Cache key gồm lens. */
export async function getCachedGscStrategicRpc(rpcArgs: RpcArgs) {
  const main = await fetchCachedGscStrategicRpcRaw(rpcArgs);
  if (!main.success || !hasHinhThucLensFilter(rpcArgs)) return main;
  const gapRes = await fetchCachedGscStrategicRpcRaw({ ...rpcArgs, p_hinh_thuc_ids: null });
  if (!gapRes.success) return main;
  return {
    success: true as const,
    data: { ...main.data, gap_analysis: gapRes.data.gap_analysis },
  };
}

/**
 * Chỉ KPI kỳ trước (BCTH): 1× strategic_impl — không matrices, không lượt gap.
 * Tag invalidate giữ GSC_STRATEGIC_CACHE_TAG; key khác cặp full.
 */
export function getCachedGscStrategicKpisOnly(rpcArgs: RpcArgs) {
  const key = JSON.stringify(rpcArgs);
  return unstable_cache(
    async () => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.rpc("rpc_dashboard_gsc_strategic_analytics_impl", rpcArgs);
      if (error) return { success: false as const, error: error.message };
      return {
        success: true as const,
        data: normalizeGscStrategicPercents(data as GscStrategicPayload),
      };
    },
    [GSC_STRATEGIC_CACHE_TAG, "kpis-only", key],
    { revalidate: REVALIDATE_SEC, tags: [GSC_STRATEGIC_CACHE_TAG] },
  )();
}

/** Cache ngắn hits TGS theo kỳ/khoa. */
export function getCachedGscTgsSessionHits(args: {
  tu_ngay: string;
  den_ngay: string;
  khoa_id?: string | null;
}) {
  const key = JSON.stringify(args);
  return unstable_cache(
    async () => {
      // service_role: gọi *_impl (wrapper yêu cầu auth.uid()).
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.rpc("rpc_gsc_tgs_session_hits", {
        p_tu_ngay: args.tu_ngay,
        p_den_ngay: args.den_ngay,
        p_khoa_id: args.khoa_id?.trim() || null,
      });
      if (error) return { rows: [] as Array<{ khoa_id: string; bang_kiem_id: string; session_id: string }>, error: error.message };
      return {
        rows: (data ?? []) as Array<{ khoa_id: string; bang_kiem_id: string; session_id: string }>,
        error: undefined as string | undefined,
      };
    },
    [GSC_TGS_HITS_CACHE_TAG, key],
    { revalidate: REVALIDATE_SEC, tags: [GSC_TGS_HITS_CACHE_TAG] },
  )();
}
