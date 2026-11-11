import { getDb, callRpc } from "@/lib/data-access";
import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";
import { applyVstHistoryReadScope } from "../lib/vst-read-scope";
import {
  VST_OBSERVATION_FULL_VIEW_SELECT,
  VST_SESSIONS_FULL_VIEW_SELECT,
  VST_SESSIONS_FULL_VIEW_SELECT_WITH_NB,
} from "../lib/vst-read-view-select";
import { isVstSessionsMetadataColumnMissing } from "../lib/vst-bo-sung-nguoi-benh";

// ============================================================================
// 1. VIEW QUERIES: v_gstt_giam_sat_vst_sessions_full & v_gstt_giam_sat_vst_full
// ============================================================================

/**
 * Đếm tổng số phiên VST theo điều kiện filter và scope quyền.
 */
export async function countVstSessions(params: {
  scope: ActorKsnkScope;
  searchFilter?: string;
}) {
  const db = await getDb("admin");
  let countQ = db
    .from("v_gstt_giam_sat_vst_sessions_full")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  countQ = applyVstHistoryReadScope(countQ, params.scope);
  if (params.searchFilter) countQ = countQ.or(params.searchFilter);

  return await countQ;
}

/**
 * Lấy danh sách 1 trang phiên VST từ view đầy đủ.
 */
export async function getVstSessionsPaginatedData(params: {
  scope: ActorKsnkScope;
  searchFilter?: string;
  sortCol: string;
  ascending: boolean;
  from: number;
  to: number;
}) {
  const db = await getDb("admin");
  let dataQ = db
    .from("v_gstt_giam_sat_vst_sessions_full")
    .select(VST_SESSIONS_FULL_VIEW_SELECT)
    .eq("is_active", true)
    .order(params.sortCol, { ascending: params.ascending })
    .range(params.from, params.to);

  dataQ = applyVstHistoryReadScope(dataQ, params.scope);
  if (params.searchFilter) dataQ = dataQ.or(params.searchFilter);

  return await dataQ;
}

/**
 * Lấy chi tiết phiên VST từ view đầy đủ, tự động fallback nếu cột metadata người bệnh chưa migrate.
 */
export async function getVstSessionDetailView(sessionId: string) {
  const db = await getDb("admin");
  const withNb = await db
    .from("v_gstt_giam_sat_vst_sessions_full")
    .select(VST_SESSIONS_FULL_VIEW_SELECT_WITH_NB)
    .eq("id", sessionId)
    .single();

  if (withNb.error && isVstSessionsMetadataColumnMissing(withNb.error)) {
    return await db
      .from("v_gstt_giam_sat_vst_sessions_full")
      .select(VST_SESSIONS_FULL_VIEW_SELECT)
      .eq("id", sessionId)
      .single();
  }

  return withNb;
}

/**
 * Lấy danh sách các cơ hội quan sát từ view v_gstt_giam_sat_vst_full theo session_id.
 */
export async function getVstObservationsView(sessionId: string) {
  const db = await getDb("admin");
  return await db
    .from("v_gstt_giam_sat_vst_full")
    .select(VST_OBSERVATION_FULL_VIEW_SELECT)
    .eq("session_id", sessionId);
}

// ============================================================================
// 2. TABLE QUERIES: gstt_fact_vst_sessions
// ============================================================================

/**
 * Lấy metadata thô của phiên từ gstt_fact_vst_sessions để giữ các yếu tố nguy cơ người bệnh (bn_*).
 */
export async function getVstSessionMetadataById(sessionId: string) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst_sessions")
    .select("metadata")
    .eq("id", sessionId)
    .maybeSingle();
}

/**
 * Tìm các phiên theo danh sách ID phục vụ kiểm tra xóa / mutation window.
 */
export async function findVstSessionsForDelete(ids: string[]) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst_sessions")
    .select("id,nguoi_giam_sat_id,is_active,created_at,ngay_giam_sat")
    .in("id", ids);
}

/**
 * Xóa mềm danh sách phiên trong gstt_fact_vst_sessions (is_active=false).
 */
export async function softDeleteVstSessions(params: {
  ids: string[];
  nowIso: string;
  deletedBy: string | null;
  lyDo: string;
}) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst_sessions")
    .update({
      is_active: false,
      deleted_at: params.nowIso,
      deleted_by: params.deletedBy,
      ly_do_xoa: params.lyDo,
      updated_at: params.nowIso,
    })
    .in("id", params.ids)
    .eq("is_active", true)
    .select("id");
}

/**
 * Lấy phiên theo ID phục vụ kiểm tra quyền và điều kiện sửa phiên.
 */
export async function findVstSessionForEdit(id: string) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst_sessions")
    .select("id,nguoi_giam_sat_id,is_active,created_at,ngay_giam_sat")
    .eq("id", id)
    .maybeSingle();
}

/**
 * Lấy phiên đã có phục vụ cập nhật trong saveVSTSession.
 */
export async function findExistingVstSessionForSave(sessionId: string) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst_sessions")
    .select("id,nguoi_giam_sat_id,is_active,created_at,metadata,ngay_giam_sat")
    .eq("id", sessionId)
    .maybeSingle();
}

/**
 * Lấy thông tin các phiên cần đánh dấu đã xem.
 */
export async function findVstSessionsForSeen(ids: string[]) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst_sessions")
    .select("id,khoa_id,nguoi_giam_sat_id")
    .in("id", ids)
    .eq("is_active", true);
}

/**
 * Đánh dấu đã xem (is_seen=true) cho danh sách phiên.
 */
export async function updateVstSessionsSeen(ids: string[]) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst_sessions")
    .update({ is_seen: true, updated_at: new Date().toISOString() })
    .in("id", ids);
}

// ============================================================================
// 3. TABLE QUERIES: gstt_fact_vst & gstt_dm_hinh_thuc_giam_sat
// ============================================================================

/**
 * Lấy các quan sát còn active của phiên để tính grandfatherPersonCap.
 */
export async function findActiveVstObservations(sessionId: string) {
  const db = await getDb("admin");
  return await db
    .from("gstt_fact_vst")
    .select("nhan_vien_id, metadata")
    .eq("session_id", sessionId)
    .eq("is_active", true);
}

/**
 * Tìm hình thức giám sát theo tên trong danh mục gstt_dm_hinh_thuc_giam_sat.
 */
export async function findVstHinhThucByName(tenHinhThuc: string) {
  const db = await getDb("admin");
  return await db
    .from("gstt_dm_hinh_thuc_giam_sat")
    .select("id")
    .eq("ten_hinh_thuc", tenHinhThuc)
    .maybeSingle();
}

// ============================================================================
// 4. LOOKUP QUERIES: Khoa phòng, Nhân sự, Khu vực
// ============================================================================

/**
 * Kiểm tra danh sách khoa_id có tồn tại trong mdm_dm_khoa_phong.
 */
export async function findKhoaPhongIds(ids: string[]) {
  const db = await getDb("admin");
  return await db.from("mdm_dm_khoa_phong").select("id").in("id", ids);
}

/**
 * Lấy danh sách nhân sự cho header dropdown (có lọc theo khoa của mạng lưới nếu có).
 */
export async function findVstHeaderNhanSu(khoaId?: string | null) {
  const db = await getDb("admin");
  let q = db
    .from("mdm_nhan_su")
    .select("id, ho_ten, khoa_id, nghe_nghiep_id")
    .eq("is_active", true);
  if (khoaId) {
    q = q.eq("khoa_id", khoaId);
  }
  return await q.order("ho_ten").limit(400);
}

/**
 * Lấy danh mục khu vực giám sát fallback từ gstt_dm_khu_vuc_giam_sat.
 */
export async function findVstKhuVucFallback() {
  const db = await getDb("admin");
  return await db
    .from("gstt_dm_khu_vuc_giam_sat")
    .select("id, ma_khu_vuc, ten_khu_vuc, thu_tu, metadata")
    .eq("is_active", true)
    .order("thu_tu");
}

// ============================================================================
// 5. RPC CALLS: rpc_vst_save_session, rpc_dashboard_vst_strategic_analytics, etc.
// ============================================================================

/**
 * Lưu phiên VST qua RPC transaction (rpc_vst_save_session).
 */
export async function saveVstSessionViaRpc(params: {
  sessionId: string | null;
  session: Record<string, unknown>;
  observations: Record<string, unknown>[];
}) {
  return await callRpc<{ session_id?: string; deduplicated?: boolean } | string>(
    "rpc_vst_save_session",
    {
      p_session_id: params.sessionId,
      p_session: params.session,
      p_observations: params.observations,
    },
    "admin",
  );
}

/**
 * Gọi RPC analytics chiến lược của VST.
 */
export async function callRpcDashboardVstStrategicAnalytics(args: Record<string, unknown>) {
  return await callRpc("rpc_dashboard_vst_strategic_analytics_impl", args, "admin");
}

/**
 * Gọi RPC so sánh ma trận của VST.
 */
export async function callRpcVstCompareMatrices(args: Record<string, unknown>) {
  return await callRpc("rpc_vst_compare_matrices_impl", args, "admin");
}

/**
 * Gọi RPC lấy options danh mục (Khu vực, Nghề nghiệp).
 */
export async function getRegistryOptionsRpc(categories: string[]) {
  return await callRpc<Record<string, Array<{ id: string; ten: string; ma?: string }>>>(
    "rpc_get_registry_options",
    { p_categories: categories },
    "admin",
  );
}

// ============================================================================
// FACADE REPO OBJECT
// ============================================================================

export const vstRepo = {
  countVstSessions,
  getVstSessionsPaginatedData,
  getVstSessionDetailView,
  getVstObservationsView,
  getVstSessionMetadataById,
  findVstSessionsForDelete,
  softDeleteVstSessions,
  findVstSessionForEdit,
  findExistingVstSessionForSave,
  findVstSessionsForSeen,
  updateVstSessionsSeen,
  findActiveVstObservations,
  findVstHinhThucByName,
  findKhoaPhongIds,
  findVstHeaderNhanSu,
  findVstKhuVucFallback,
  saveVstSessionViaRpc,
  callRpcDashboardVstStrategicAnalytics,
  callRpcVstCompareMatrices,
  getRegistryOptionsRpc,
};
