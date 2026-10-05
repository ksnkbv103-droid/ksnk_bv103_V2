"use server";

import { z } from "zod";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { resolveAnalyticsRpcFilters } from "@/lib/analytics/resolve-analytics-rpc-scope";
import { getCachedGscStrategicRpc } from "@/lib/analytics/strategic-analytics-cache";
import { selectGscGenericBangKiemMas } from "@/lib/domain/gsc-lop-giam-sat-filter";
import type { GscStrategicFilters } from "../types/gsc-strategic.types";

const gscStrategicFiltersSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "tu_ngay YYYY-MM-DD"),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "den_ngay YYYY-MM-DD"),
  khoi_ids: z.array(z.string()).optional(),
  khoa_ids: z.array(z.string()).optional(),
  nghe_nghiep_ids: z.array(z.string()).optional(),
  khu_vuc_ids: z.array(z.string()).optional(),
  hinh_thuc_ids: z.array(z.string()).optional(),
  bang_kiem_mas: z.array(z.string()).optional(),
  /** false = giữ BM.02/03 (khối Vệ sinh tay). Mặc định true = tổng GSC generic. */
  exclude_vst_hub_bang_kiem: z.boolean().optional(),
});

export async function getGscStrategicAnalytics(filters: GscStrategicFilters) {
  const parsed = gscStrategicFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; ") || "Tham số không hợp lệ",
    };
  }
  const f = parsed.data;
  const excludeHub = f.exclude_vst_hub_bang_kiem !== false;

  await verifyPermission("GIAM_SAT_CHUNG", "view");

  const supabase = await createServerSupabaseUserClient();
  const scope = await getActorKsnkScope();
  const rpcFilters = resolveAnalyticsRpcFilters(scope, f, "gsc");
  let p_bang_kiem_mas = f.bang_kiem_mas && f.bang_kiem_mas.length > 0 ? f.bang_kiem_mas : null;
  if (!p_bang_kiem_mas) {
    const { data: tuanThuRows, error: bkErr } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("ma_bk")
      .or("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU");
    if (bkErr) return { success: false as const, error: bkErr.message };
    const mas = (tuanThuRows ?? [])
      .map((r) => String(r.ma_bk ?? "").trim())
      .filter((ma) => ma.length > 0);
    p_bang_kiem_mas = mas.length > 0 ? mas : null;
  }
  // BCTH-01: BK mặc định / lọc GSC không gồm hub VST (BM.02/03).
  if (excludeHub && p_bang_kiem_mas) {
    p_bang_kiem_mas = selectGscGenericBangKiemMas(p_bang_kiem_mas);
  }

  const rpcArgs = {
    p_tu_ngay: f.tu_ngay,
    p_den_ngay: f.den_ngay,
    ...rpcFilters,
    p_bang_kiem_mas,
  };

  // A) Gọi RPC mỗi mở dashboard. B) Promise.all + unstable_cache 90s — chọn B.
  return getCachedGscStrategicRpc(rpcArgs);
}
