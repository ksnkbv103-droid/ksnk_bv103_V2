"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { DASHBOARD_CC_WIDGET } from "@/lib/dashboard-command-center-widget-keys";
import { mergeQlcvScopeWithSearchOr, resolveQlcvListScope } from "../lib/qlcv-list-scope";

export type QlcvQuaHanBriefRow = {
  id: string;
  tieu_de: string;
  han_hoan_thanh: string | null;
  nguoi_phu_trach_ten: string | null;
  phan_tram_hoan_thanh: number;
};

export type QlcvQuaHanBrief = {
  totalCount: number;
  items: QlcvQuaHanBriefRow[];
};

/** Tóm tắt việc quá hạn — Command Center hoặc người có quyền QLCV/Dashboard. */
export async function getQlcvQuaHanBrief(limit = 8): Promise<QlcvQuaHanBrief> {
  await verifyAnyPermission([
    { moduleKey: "CONG_VIEC", action: "view" },
    { moduleKey: "DASHBOARD", action: "view" },
    { moduleKey: DASHBOARD_CC_WIDGET.OVERVIEW, action: "view" },
  ]);

  const supabase = createAdminSupabaseClient();
  const scope = await resolveQlcvListScope(supabase);
  const cap = Math.min(20, Math.max(1, limit));

  const scopeFilter = mergeQlcvScopeWithSearchOr(scope, null);

  let countQ = supabase
    .from("v_qlcv_cong_viec_qua_han")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (scopeFilter) countQ = countQ.or(scopeFilter);

  let listQ = supabase
    .from("v_qlcv_cong_viec_qua_han")
    .select("id,tieu_de,han_hoan_thanh,nguoi_phu_trach_ten,phan_tram_hoan_thanh")
    .eq("is_active", true)
    .order("han_hoan_thanh", { ascending: true })
    .limit(cap);
  if (scopeFilter) listQ = listQ.or(scopeFilter);

  const [{ count, error: countErr }, { data, error: listErr }] = await Promise.all([countQ, listQ]);
  if (countErr) throw new Error(countErr.message);
  if (listErr) throw new Error(listErr.message);

  return {
    totalCount: count ?? 0,
    items: (data || []) as QlcvQuaHanBriefRow[],
  };
}
