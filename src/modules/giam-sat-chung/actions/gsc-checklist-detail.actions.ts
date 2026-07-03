"use server";

import { z } from "zod";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import type { GscChecklistDetailPayload, GscStrategicFilters } from "../types/gsc-strategic.types";

const detailFiltersSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  ma_bk: z.string().trim().min(1),
  khoi_ids: z.array(z.string()).optional(),
  khoa_ids: z.array(z.string()).optional(),
  nghe_nghiep_ids: z.array(z.string()).optional(),
  khu_vuc_ids: z.array(z.string()).optional(),
  hinh_thuc_ids: z.array(z.string()).optional(),
});

export async function getGscChecklistDetail(
  filters: GscStrategicFilters & { ma_bk: string },
): Promise<{ success: true; data: GscChecklistDetailPayload } | { success: false; error: string }> {
  const parsed = detailFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; ") || "Tham số không hợp lệ",
    };
  }

  await verifyPermission("GIAM_SAT_CHUNG", "view");

  const supabase = await createServerSupabaseUserClient();
  const scope = await getActorKsnkScope();
  const f = parsed.data;
  const isNetwork = scope.isMangLuoiKsnk;

  const filterRpcArgs = {
    p_tu_ngay: f.tu_ngay,
    p_den_ngay: f.den_ngay,
    p_khoi_ids: isNetwork ? null : f.khoi_ids?.length ? f.khoi_ids : null,
    p_khoa_ids: isNetwork
      ? scope.actorKhoaId
        ? [scope.actorKhoaId]
        : null
      : f.khoa_ids?.length
        ? f.khoa_ids
        : null,
    p_nghe_nghiep_ids: isNetwork ? null : f.nghe_nghiep_ids?.length ? f.nghe_nghiep_ids : null,
    p_khu_vuc_ids: isNetwork ? null : f.khu_vuc_ids?.length ? f.khu_vuc_ids : null,
    p_hinh_thuc_ids: isNetwork ? null : f.hinh_thuc_ids?.length ? f.hinh_thuc_ids : null,
  };

  const [{ data, error }, { data: matrices, error: matrixErr }] = await Promise.all([
    supabase.rpc("rpc_gsc_checklist_detail", {
      ...filterRpcArgs,
      p_ma_bk: f.ma_bk,
    }),
    supabase.rpc("rpc_gsc_compare_matrices", {
      ...filterRpcArgs,
      p_bang_kiem_mas: [f.ma_bk],
    }),
  ]);

  if (error) return { success: false, error: error.message };
  if (matrixErr) return { success: false, error: matrixErr.message };

  const merged = {
    ...(data as GscChecklistDetailPayload),
    ...(matrices as Record<string, unknown>),
  } as GscChecklistDetailPayload;

  return { success: true, data: merged };
}
