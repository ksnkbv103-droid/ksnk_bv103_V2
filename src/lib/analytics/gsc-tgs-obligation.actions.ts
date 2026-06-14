"use server";

import { z } from "zod";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import type { BangKiemApDungSource } from "@/lib/domain/bang-kiem-ap-dung";
import type { TgsCoverageHit } from "@/lib/analytics/tgs-coverage-mappers";

const filtersSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  khoi_ids: z.array(z.string()).optional(),
  khoa_ids: z.array(z.string()).optional(),
});

export type GscTgsObligationContext = {
  catalog: BangKiemApDungSource[];
  hits: TgsCoverageHit[];
};

export async function getGscTgsObligationContext(
  filters: z.infer<typeof filtersSchema>,
): Promise<{ success: true; data: GscTgsObligationContext } | { success: false; error: string }> {
  const parsed = filtersSchema.safeParse(filters);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  await verifyPermission("GIAM_SAT_CHUNG", "view");

  const supabase = await createServerSupabaseUserClient();
  const scope = await getActorKsnkScope();
  const f = parsed.data;
  const p_khoi_ids = scope.isMangLuoiKsnk
    ? null
    : f.khoi_ids && f.khoi_ids.length > 0
      ? f.khoi_ids
      : null;
  const p_khoa_ids = scope.isMangLuoiKsnk
    ? scope.actorKhoaId
      ? [scope.actorKhoaId]
      : null
    : f.khoa_ids && f.khoa_ids.length > 0
      ? f.khoa_ids
      : null;

  const { data: catalogRows, error: catErr } = await supabase
    .from("gstt_dm_bang_kiem")
    .select("id, ma_bk, ten_bang_kiem, is_active, phan_loai_chuyen_mon, loai_giam_sat, ap_dung_jsonb")
    .eq("is_active", true)
    .order("ma_bk");

  if (catErr) return { success: false, error: catErr.message };

  let hitQuery = supabase
    .from("gstt_fact_gsc_dashboard_summary")
    .select("khoa_id, bang_kiem_id")
    .eq("stype", "TU_GIAM_SAT")
    .gte("ngay_giam_sat", f.tu_ngay)
    .lte("ngay_giam_sat", f.den_ngay);

  if (p_khoa_ids) hitQuery = hitQuery.in("khoa_id", p_khoa_ids);

  const { data: hitRows, error: hitErr } = await hitQuery;
  if (hitErr) return { success: false, error: hitErr.message };

  let filteredHits = (hitRows ?? []) as { khoa_id: string; bang_kiem_id: string }[];

  if (p_khoi_ids) {
    const { data: khoaRows, error: khoaErr } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id")
      .in("khoi_id", p_khoi_ids);
    if (khoaErr) return { success: false, error: khoaErr.message };
    const allowed = new Set((khoaRows ?? []).map((r) => r.id as string));
    filteredHits = filteredHits.filter((h) => allowed.has(h.khoa_id));
  }

  const seen = new Set<string>();
  const hits: TgsCoverageHit[] = [];
  for (const row of filteredHits) {
    const key = `${row.khoa_id}|${row.bang_kiem_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({ khoa_id: row.khoa_id, bang_kiem_id: row.bang_kiem_id });
  }

  return {
    success: true,
    data: {
      catalog: (catalogRows ?? []) as BangKiemApDungSource[],
      hits,
    },
  };
}
