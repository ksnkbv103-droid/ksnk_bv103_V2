"use server";

import { z } from "zod";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import type { GscStrategicFilters, GscStrategicPayload } from "../types/gsc-strategic.types";

const gscStrategicFiltersSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "tu_ngay YYYY-MM-DD"),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "den_ngay YYYY-MM-DD"),
  khoi_ids: z.array(z.string()).optional(),
  khoa_ids: z.array(z.string()).optional(),
  nghe_nghiep_ids: z.array(z.string()).optional(),
  khu_vuc_ids: z.array(z.string()).optional(),
  hinh_thuc_ids: z.array(z.string()).optional(),
  bang_kiem_mas: z.array(z.string()).optional(),
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

  await verifyPermission("GIAM_SAT_CHUNG", "view");

  const supabase = await createServerSupabaseUserClient();
  const scope = await getActorKsnkScope();
  const isNetwork = scope.isMangLuoiKsnk;
  const p_khoi_ids = isNetwork ? null : f.khoi_ids && f.khoi_ids.length > 0 ? f.khoi_ids : null;
  const p_khoa_ids = isNetwork
    ? scope.actorKhoaId
      ? [scope.actorKhoaId]
      : null
    : f.khoa_ids && f.khoa_ids.length > 0
      ? f.khoa_ids
      : null;
  const p_nghe_nghiep_ids = isNetwork ? null : f.nghe_nghiep_ids && f.nghe_nghiep_ids.length > 0 ? f.nghe_nghiep_ids : null;
  const p_khu_vuc_ids = isNetwork ? null : f.khu_vuc_ids && f.khu_vuc_ids.length > 0 ? f.khu_vuc_ids : null;
  const p_hinh_thuc_ids = isNetwork ? null : f.hinh_thuc_ids && f.hinh_thuc_ids.length > 0 ? f.hinh_thuc_ids : null;
  const p_bang_kiem_mas = f.bang_kiem_mas && f.bang_kiem_mas.length > 0 ? f.bang_kiem_mas : null;

  const { data, error } = await supabase.rpc("rpc_dashboard_gsc_strategic_analytics", {
    p_tu_ngay: f.tu_ngay,
    p_den_ngay: f.den_ngay,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
    p_hinh_thuc_ids,
    p_bang_kiem_mas,
  });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as GscStrategicPayload };
}
