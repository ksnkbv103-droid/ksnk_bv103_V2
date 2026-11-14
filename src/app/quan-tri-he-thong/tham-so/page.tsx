import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import { canAccessThamSoRoute } from "@/lib/auth/quan-tri-access";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { THAM_SO_MAC_DINH } from "@/lib/analytics/supervision-thresholds";
import ThamSoPanel, { type ThamSoRow } from "@/modules/quan-tri-he-thong/components/ThamSoPanel";

export const metadata = { title: "Tham số nghiệp vụ" };

export default async function ThamSoPage() {
  if (!(await canAccessThamSoRoute())) {
    return <QuanTriAccessDenied detail="Chỉ quản trị viên được xem và thêm tham số nghiệp vụ." />;
  }
  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase
    .from("ksnk_dm_tham_so")
    .select("id, ma_tham_so, gia_tri, hieu_luc_tu, nguon")
    .order("ma_tham_so")
    .order("hieu_luc_tu", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({ ...r, gia_tri: Number(r.gia_tri) })) as ThamSoRow[];
  return <ThamSoPanel rows={rows} maList={Object.keys(THAM_SO_MAC_DINH)} homNay={todayYmdInVn()} />;
}
