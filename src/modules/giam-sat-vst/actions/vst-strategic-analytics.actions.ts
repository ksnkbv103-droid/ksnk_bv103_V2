"use server";

import { z } from "zod";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { resolveAnalyticsRpcFilters } from "@/lib/analytics/resolve-analytics-rpc-scope";
import { getCachedVstStrategicRpc } from "@/lib/analytics/strategic-analytics-cache";
import type { VstStrategicFilters } from "../types/vst-strategic.types";

const vstStrategicFiltersSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "tu_ngay YYYY-MM-DD"),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "den_ngay YYYY-MM-DD"),
  khoi_ids: z.array(z.string()).optional(),
  khoa_ids: z.array(z.string()).optional(),
  nghe_nghiep_ids: z.array(z.string()).optional(),
  khu_vuc_ids: z.array(z.string()).optional(),
  hinh_thuc_ids: z.array(z.string()).optional(),
});

export async function getVstStrategicAnalytics(filters: VstStrategicFilters) {
  const parsed = vstStrategicFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; ") || "Tham số không hợp lệ",
    };
  }
  const f = parsed.data;

  await verifyPermission("GIAM_SAT_VST", "view");

  const scope = await getActorKsnkScope();
  const rpcFilters = resolveAnalyticsRpcFilters(scope, f, "vst");

  const rpcArgs = {
    p_tu_ngay: f.tu_ngay,
    p_den_ngay: f.den_ngay,
    ...rpcFilters,
  };

  // A) Gọi RPC mỗi mở dashboard. B) Promise.all + unstable_cache 90s — chọn B.
  return getCachedVstStrategicRpc(rpcArgs);
}
