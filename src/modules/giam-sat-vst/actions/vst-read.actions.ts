"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { buildDisplayMaps, toDistinctIds } from "@/lib/master-data/gateway";
import { vstReadErrorMessage } from "../lib/vst-read-utils";
import { VST_OBSERVATION_FULL_VIEW_SELECT, VST_SESSIONS_FULL_VIEW_SELECT } from "../lib/vst-read-view-select";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { applyVstHistoryReadScope } from "../lib/vst-read-scope";

/**
 * Phiên bản phân trang Server-side cho Lịch sử VST.
 * Client chỉ nhận đúng 1 trang (~20 bản ghi), DB thực hiện filter/sort/count.
 */
export async function getVSTSessionsPaginated(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "view");
    const scope = await getActorKsnkScope();

    const page = params.page ?? 1;
    const size = Math.min(Math.max(params.pageSize ?? 20, 10), 50);
    const from = (page - 1) * size;
    const to = from + size - 1;
    const rawSort = String(params.sortKey || "").trim();
    const sortAlias: Record<string, string> = {
      khoa: "ten_khoa_phong",
      nguoi_giam_sat_id: "ten_nguoi_giam_sat",
    };
    const resolvedSort = sortAlias[rawSort] || rawSort;
    const allowedSortCols = new Set([
      "created_at",
      "updated_at",
      "ngay_giam_sat",
      "thoi_gian_bat_dau",
      "thoi_gian_ket_thuc",
      "hinh_thuc_giam_sat",
      "cach_thuc_giam_sat",
      "ten_khoa_phong",
      "ten_khu_vuc_giam_sat",
      "ten_nguoi_giam_sat",
    ]);
    const sortCol = allowedSortCols.has(resolvedSort) ? resolvedSort : "created_at";
    const ascending = params.sortDir === "asc";

    const searchFilter = buildSupabaseSearchFilter(params.search, [
      "ten_nguoi_giam_sat",
      "ma_khoa_phong",
      "ten_khoa_phong",
      "ten_khu_vuc_giam_sat"
    ]);

    // 1. COUNT
    let countQ = supabase
      .from("v_gstt_giam_sat_vst_sessions_full")
      .select("id", { count: "exact", head: true });
    countQ = applyVstHistoryReadScope(countQ, scope);
    if (searchFilter) countQ = countQ.or(searchFilter);
    const { count, error: cErr } = await countQ;
    if (cErr) throw cErr;

    // 2. DATA — 1 trang
    let dataQ = supabase
      .from("v_gstt_giam_sat_vst_sessions_full")
      .select(VST_SESSIONS_FULL_VIEW_SELECT)
      .order(sortCol, { ascending })
      .range(from, to);
    dataQ = applyVstHistoryReadScope(dataQ, scope);
    if (searchFilter) dataQ = dataQ.or(searchFilter);
    const { data, error } = await dataQ;
    if (error) throw error;

    const enriched = (data || []).map((x: Record<string, unknown>) => ({
      ...x,
      is_seen: Boolean(x.is_seen),
      danh_muc_khu_vuc: { ten_danh_muc: (x.ten_khu_vuc_giam_sat as string) || "—" },
      danh_muc_khoa: { ten_danh_muc: (x.ten_khoa_phong as string) || "—" },
      nguoi_giam_sat: { ho_ten: (x.ten_nguoi_giam_sat as string) || "—" },
      observations: [],
    }));

    return { success: true, data: enriched, totalCount: count ?? 0, page, pageSize: size };
  } catch (error: unknown) {
    return { success: false, error: vstReadErrorMessage(error) };
  }
}


export async function getVSTSessionDetail(sessionId: string) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "view");
    const scope = await getActorKsnkScope();

    // 1. Fetch Session Metadata from View (Smart DB pattern)
    const { data: sessionView, error: sErr } = await supabase
      .from("v_gstt_giam_sat_vst_sessions_full")
      .select(VST_SESSIONS_FULL_VIEW_SELECT)
      .eq("id", sessionId)
      .single();

    if (sErr) throw sErr;
    if (!sessionView) throw new Error("Không tìm thấy phiên giám sát.");

    if (scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk) {
      const myKhoa = scope.actorKhoaId ? String(scope.actorKhoaId) : null;
      const myNs = scope.actorNhanSuId ? String(scope.actorNhanSuId) : null;
      const sessionKhoa = sessionView.khoa_id ? String(sessionView.khoa_id) : null;
      const sessionGs = sessionView.nguoi_giam_sat_id ? String(sessionView.nguoi_giam_sat_id) : null;
      const allowedByKhoa = Boolean(myKhoa && sessionKhoa && myKhoa === sessionKhoa);
      const allowedByGs = Boolean(myNs && sessionGs && myNs === sessionGs);
      if (!allowedByKhoa && !allowedByGs) {
        return { success: false as const, error: "Không tìm thấy phiên giám sát." };
      }
    }

    // Map view fields back to the format expected by the UI
    const session = {
      ...sessionView,
      danh_muc_khoa: { ten_danh_muc: sessionView.ten_khoa_phong || "—" },
      danh_muc_khu_vuc: { ten_danh_muc: sessionView.ten_khu_vuc_giam_sat || "—" },
      nguoi_giam_sat: { ho_ten: sessionView.ten_nguoi_giam_sat || "—" },
    };

    // 2. Fetch Observations
    const { data: observations, error: oErr } = await supabase
      .from("v_gstt_giam_sat_vst_full")
      .select(VST_OBSERVATION_FULL_VIEW_SELECT)
      .eq("session_id", sessionId);
    
    if (oErr) throw oErr;

    // 3. Prepare Personnel Names for Print/Detail
    const observerId = String(session.nguoi_giam_sat_id || "");
    const nvIds = toDistinctIds(((observations || []) as { nhan_vien_id?: string }[]).map((o) => o.nhan_vien_id));
    const nhanSuIds = toDistinctIds([observerId, ...nvIds]);
    
    const { nhanSuMap } = await buildDisplayMaps(supabase as unknown as Parameters<typeof buildDisplayMaps>[0], {
      nhanSuIds,
    });

    const nhanSuForPrint = nhanSuIds
      .map((id) => ({ id, ho_ten: nhanSuMap.get(id) || "" }))
      .filter((x) => x.ho_ten);

    return { success: true, session, observations, nhanSuForPrint };
  } catch (error: unknown) {
    return { success: false, error: vstReadErrorMessage(error) };
  }
}

