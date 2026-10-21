/**
 * Helper chỉ chạy phía server (không phải Server Action) — áp phạm vi khoa NK-SCOPE cho các action đọc NKBV.
 */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { nkbvKhoaVisible, resolveNkbvKhoaRestriction, type NkbvKhoaRestriction } from "./nkbv-khoa-scope";

export async function getNkbvKhoaRestriction(): Promise<NkbvKhoaRestriction> {
  return resolveNkbvKhoaRestriction(await getActorKsnkScope());
}

export const NKBV_OUT_OF_SCOPE_ERROR = "Hồ sơ nằm ngoài khoa của bạn.";

/** Hồ sơ BA có hiển thị với actor không (khoa điều trị hoặc có ngày nằm ở khoa mình). */
export async function isNkbvBenhAnInScope(r: NkbvKhoaRestriction, maBenhAn: string): Promise<boolean> {
  if (r.kind === "all") return true;
  if (r.kind === "none") return false;
  const ma = maBenhAn.trim();
  if (!ma) return false;
  const admin = createAdminSupabaseClient();
  const [{ data: ba }, { data: days }] = await Promise.all([
    admin.from("nkbv_fact_benh_an").select("khoa_dieu_tri_id").eq("ma_benh_an", ma).eq("is_active", true).maybeSingle(),
    admin.from("nkbv_fact_ba_ngay_khoa").select("khoa_id").eq("ma_benh_an", ma).eq("khoa_id", r.khoaId).limit(1),
  ]);
  return nkbvKhoaVisible(r, [ba?.khoa_dieu_tri_id as string | null, ...(days || []).map((d) => d.khoa_id as string)]);
}
