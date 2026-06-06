"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  qlcvRowMatchesListScope,
  resolveQlcvListScope,
  type QlcvListScope,
} from "./qlcv-list-scope";

export type { QlcvListScope } from "./qlcv-list-scope";
export { applyQlcvListScopeToQuery } from "./qlcv-list-scope";

export async function getQlcvListScope(): Promise<QlcvListScope> {
  const supabase = createAdminSupabaseClient();
  return resolveQlcvListScope(supabase);
}

export async function assertQlcvTaskVisible(congViecId: string, scope?: QlcvListScope): Promise<void> {
  const s = scope ?? (await getQlcvListScope());
  if (s.bypassAll) return;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, nguoi_phu_trach_id, nguoi_tao_id, khoa_thuc_hien_id")
    .eq("id", congViecId)
    .maybeSingle();

  if (error || !data) throw new Error("Không tìm thấy công việc hoặc không có quyền xem.");
  if (!qlcvRowMatchesListScope(data, s)) {
    throw new Error("Bạn không có quyền xem công việc này.");
  }
}
