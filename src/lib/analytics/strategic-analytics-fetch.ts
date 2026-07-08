import { getGscStrategicAnalytics } from "@/modules/giam-sat-chung/actions/gsc-strategic-analytics.actions";
import { getVstStrategicAnalytics } from "@/modules/giam-sat-vst/actions/vst-strategic-analytics.actions";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { AnalyticsFilterInput } from "@/lib/analytics/filter-helpers";

type StrategicRpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type CacheEntry = {
  vst?: StrategicRpcResult<VstStrategicPayload>;
  gsc?: StrategicRpcResult<GscStrategicPayload>;
  at: number;
};

const TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(fp: AnalyticsFilterInput): string {
  return JSON.stringify(fp);
}

export type StrategicModule = "vst" | "gsc";

/** Gom fetch strategic RPC — cache ngắn hạn tránh triple-call Command Center + module tabs. */
export async function fetchStrategicAnalytics(
  fp: AnalyticsFilterInput,
  modules: readonly StrategicModule[],
): Promise<{ vst?: StrategicRpcResult<VstStrategicPayload>; gsc?: StrategicRpcResult<GscStrategicPayload> }> {
  const key = cacheKey(fp);
  const hit = cache.get(key);
  const fresh = hit && Date.now() - hit.at < TTL_MS;

  const needVst = modules.includes("vst");
  const needGsc = modules.includes("gsc");

  if (fresh && hit) {
    const vst = needVst ? hit.vst : undefined;
    const gsc = needGsc ? hit.gsc : undefined;
    if ((!needVst || vst) && (!needGsc || gsc)) {
      return { vst, gsc };
    }
  }

  const [vstRes, gscRes] = await Promise.all([
    needVst ? getVstStrategicAnalytics(fp) : Promise.resolve(undefined),
    needGsc ? getGscStrategicAnalytics(fp) : Promise.resolve(undefined),
  ]);

  const entry: CacheEntry = {
    at: Date.now(),
    vst: vstRes,
    gsc: gscRes,
  };
  if (fresh && hit) {
    entry.vst = needVst ? vstRes : hit.vst;
    entry.gsc = needGsc ? gscRes : hit.gsc;
  }
  cache.set(key, entry);

  return { vst: vstRes, gsc: gscRes };
}
