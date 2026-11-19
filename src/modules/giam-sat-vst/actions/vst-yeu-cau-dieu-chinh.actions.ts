"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/data-access";
import { getActorRoleNames, verifyPermission } from "@/lib/server-permission";
import { getActorAuthUserId } from "@/lib/actor-auth-server";
import { assertSupervisionNotLockedForDate } from "@/lib/supervision-module-lock";
import { logAdminAction } from "@/lib/admin-audit";
import { chuanHoaLyDoTuChoi } from "@/lib/domain/ly-do-tu-choi";
import { vstRepo } from "../repo/vst.repo";
import { vstWriteErrorMessage } from "./vst-write.helpers";
import { duocDuyetYeuCauVst, type VstLoaiYeuCau } from "../lib/vst-yeu-cau-dieu-chinh";

const BANG = "gstt_fact_vst_yeu_cau_dieu_chinh";

export type VstYeuCauDieuChinhRow = {
  id: string;
  sessionId: string;
  loai: VstLoaiYeuCau;
  lyDo: string;
  createdAt: string;
  nguoiYeuCau: string;
  tenKhoa: string;
  ngayGiamSat: string;
};

type Kq<T = undefined> = ({ success: true } & (T extends undefined ? object : { data: T })) | { success: false; error: string };

/** Hàng chờ duyệt sửa/xóa muộn phiên VST (tối đa 50 yêu cầu cũ nhất). */
export async function listVstYeuCauChoDuyetAction(): Promise<Kq<VstYeuCauDieuChinhRow[]>> {
  try {
    await verifyPermission("GIAM_SAT_VST", "approve");
    const db = await getDb("admin");
    const { data, error } = await db
      .from(BANG)
      .select("id,session_id,loai,ly_do,created_at,nguoi_yeu_cau_nhan_su_id")
      .eq("trang_thai", "CHO_DUYET")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw error;
    const rows = (data || []) as Array<Record<string, string | null>>;
    const sessionIds = [...new Set(rows.map((r) => String(r.session_id)))];
    const nsIds = [...new Set(rows.map((r) => r.nguoi_yeu_cau_nhan_su_id).filter(Boolean))] as string[];
    const [ss, ns] = await Promise.all([
      sessionIds.length
        ? db.from("gstt_fact_vst_sessions").select("id,ngay_giam_sat,khoa_id").in("id", sessionIds)
        : Promise.resolve({ data: [] }),
      nsIds.length ? db.from("mdm_nhan_su").select("id,ho_ten").in("id", nsIds) : Promise.resolve({ data: [] }),
    ]);
    const sessions = (ss.data || []) as Array<{ id: string; ngay_giam_sat: string | null; khoa_id: string | null }>;
    const khoaIds = [...new Set(sessions.map((s) => s.khoa_id).filter(Boolean))] as string[];
    const { data: khoas } = khoaIds.length
      ? await db.from("mdm_dm_khoa_phong").select("id,ten_khoa").in("id", khoaIds)
      : { data: [] };
    const tenKhoa = new Map(((khoas || []) as Array<{ id: string; ten_khoa: string }>).map((k) => [k.id, k.ten_khoa]));
    const sById = new Map(sessions.map((s) => [s.id, s]));
    const tenNs = new Map(((ns.data || []) as Array<{ id: string; ho_ten: string }>).map((n) => [n.id, n.ho_ten]));
    return {
      success: true,
      data: rows.map((r) => {
        const s = sById.get(String(r.session_id));
        return {
          id: String(r.id),
          sessionId: String(r.session_id),
          loai: r.loai as VstLoaiYeuCau,
          lyDo: String(r.ly_do ?? ""),
          createdAt: String(r.created_at ?? ""),
          nguoiYeuCau: tenNs.get(String(r.nguoi_yeu_cau_nhan_su_id)) ?? "—",
          tenKhoa: (s?.khoa_id && tenKhoa.get(s.khoa_id)) || "—",
          ngayGiamSat: String(s?.ngay_giam_sat ?? "").slice(0, 10),
        };
      }),
    };
  } catch (error: unknown) {
    return { success: false, error: vstWriteErrorMessage(error) };
  }
}

/** Chiếm yêu cầu đang chờ (so-và-đổi trạng thái) để hai người duyệt cùng lúc không áp hai lần. */
async function chiemYeuCau(id: string, trangThai: "DA_DUYET" | "TU_CHOI", lyDoTuChoi?: string) {
  await verifyPermission("GIAM_SAT_VST", "approve");
  const reqId = String(id || "").trim();
  if (!reqId) throw new Error("Thiếu mã yêu cầu.");
  const db = await getDb("admin");
  const { data: req, error } = await db
    .from(BANG)
    .select("id,session_id,loai,ly_do,trang_thai,payload,nguoi_yeu_cau_auth_id,nguoi_yeu_cau_nhan_su_id")
    .eq("id", reqId)
    .maybeSingle();
  if (error) throw error;
  if (!req || req.trang_thai !== "CHO_DUYET") throw new Error("Yêu cầu không còn chờ duyệt, vui lòng tải lại.");

  const actorAuthUserId = await getActorAuthUserId();
  const laAdmin = (await getActorRoleNames()).includes("ADMIN");
  if (
    !duocDuyetYeuCauVst({
      nguoiDuyetAuthId: actorAuthUserId,
      nguoiYeuCauAuthId: String(req.nguoi_yeu_cau_auth_id ?? ""),
      laAdmin,
    })
  ) {
    throw new Error("Không được tự xử lý yêu cầu do chính mình tạo.");
  }

  const { data: claimed, error: claimErr } = await db
    .from(BANG)
    .update({
      trang_thai: trangThai,
      nguoi_duyet_auth_id: actorAuthUserId,
      ly_do_tu_choi: lyDoTuChoi ?? null,
      xu_ly_luc: new Date().toISOString(),
    })
    .eq("id", reqId)
    .eq("trang_thai", "CHO_DUYET")
    .select("id");
  if (claimErr) throw claimErr;
  if (!claimed?.length) throw new Error("Yêu cầu vừa được người khác xử lý, vui lòng tải lại.");
  return { db, req, actorAuthUserId };
}

async function traLaiChoDuyet(db: Awaited<ReturnType<typeof getDb>>, id: string) {
  await db
    .from(BANG)
    .update({ trang_thai: "CHO_DUYET", nguoi_duyet_auth_id: null, xu_ly_luc: null })
    .eq("id", id);
}

/** Áp nội dung đề nghị sửa (đã kiểm ở server lúc gửi) lên phiên; nhật ký giữ bản trước và sau. */
async function apDungYeuCauSua(
  db: Awaited<ReturnType<typeof getDb>>,
  p: {
    sid: string;
    lyDo: string;
    before: Record<string, unknown>;
    req: Record<string, unknown>;
    actorAuthUserId: string | null;
  },
) {
  const payload = p.req.payload as { session?: Record<string, unknown>; observations?: unknown[] } | null;
  if (!payload?.session || !Array.isArray(payload.observations) || !payload.observations.length) {
    throw new Error("Yêu cầu sửa thiếu nội dung đề nghị.");
  }
  const ngayMoi = String(payload.session.ngay_giam_sat ?? "").slice(0, 10);
  if (ngayMoi) await assertSupervisionNotLockedForDate(db, "VST", ngayMoi);
  const { data: obsTruoc, error: obsErr } = await vstRepo.findActiveVstObservations(p.sid);
  if (obsErr) throw obsErr;
  const { error: rpcErr } = await vstRepo.saveVstSessionViaRpc({
    sessionId: p.sid,
    // VST-027: duyệt không đổi chủ phiên (kể cả yêu cầu cũ mang người gửi trong payload).
    session: p.before.nguoi_giam_sat_id
      ? { ...payload.session, nguoi_giam_sat_id: p.before.nguoi_giam_sat_id }
      : payload.session,
    observations: payload.observations as Record<string, unknown>[],
  });
  if (rpcErr) throw rpcErr;
  await logAdminAction({
    action: "VST_EDIT_SESSION_AFTER_WINDOW",
    targetTable: "gstt_fact_vst_sessions",
    targetId: p.sid,
    before: { ...p.before, so_co_hoi: (obsTruoc || []).length, co_hoi: obsTruoc || [] },
    after: {
      ...payload.session,
      so_co_hoi: payload.observations.length,
      co_hoi: payload.observations,
      yeu_cau_id: p.req.id,
      nguoi_yeu_cau_auth_id: p.req.nguoi_yeu_cau_auth_id,
    },
    reason: p.lyDo,
    actorUserId: p.actorAuthUserId,
  });
}

/**
 * Duyệt yêu cầu: áp thay đổi lên phiên và ghi nhật ký trước/sau.
 * @dac-ta R1.24, R1.25
 */
export async function approveVstYeuCauAction(id: string): Promise<Kq> {
  try {
    const { db, req, actorAuthUserId } = await chiemYeuCau(id, "DA_DUYET");
    try {
      const sid = String(req.session_id);
      const lyDo = String(req.ly_do);
      const { data: rows, error: qErr } = await vstRepo.findVstSessionsForDelete([sid]);
      if (qErr) throw qErr;
      const before = (rows || [])[0] as
        | { is_active?: boolean; ngay_giam_sat?: string | null; nguoi_giam_sat_id?: string | null }
        | undefined;
      if (!before || before.is_active === false) throw new Error("Phiên không còn hoặc đã bị vô hiệu.");
      await assertSupervisionNotLockedForDate(db, "VST", before.ngay_giam_sat ?? null);
      if (req.loai === "SUA") {
        await apDungYeuCauSua(db, { sid, lyDo, before, req, actorAuthUserId });
      } else {
        const { data: updated, error: delErr } = await vstRepo.softDeleteVstSessions({
          ids: [sid],
          nowIso: new Date().toISOString(),
          deletedBy: (req.nguoi_yeu_cau_nhan_su_id as string | null) ?? null,
          lyDo,
        });
        if (delErr) throw delErr;
        if (!updated?.length) throw new Error("Phiên đã thay đổi trước đó, vui lòng tải lại.");
        await logAdminAction({
          action: "VST_SOFT_DELETE_SESSION",
          targetTable: "gstt_fact_vst_sessions",
          targetId: sid,
          before: { ...before },
          after: { is_active: false, ly_do_xoa: lyDo, yeu_cau_id: req.id, nguoi_yeu_cau_auth_id: req.nguoi_yeu_cau_auth_id },
          reason: lyDo,
          actorUserId: actorAuthUserId,
        });
      }
    } catch (applyErr) {
      await traLaiChoDuyet(db, String(req.id));
      throw applyErr;
    }
    revalidatePath("/phe-duyet");
    revalidatePath("/giam-sat-vst");
    revalidatePath("/lich-su/vst");
    const { invalidateVstStrategicAnalyticsCache } = await import("@/lib/analytics/strategic-analytics-cache");
    invalidateVstStrategicAnalyticsCache();
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: vstWriteErrorMessage(error) };
  }
}

/** Từ chối yêu cầu: phiên giữ nguyên. */
export async function rejectVstYeuCauAction(id: string, lyDoTuChoi?: string): Promise<Kq> {
  try {
    // QT-016: bắt buộc lý do ≥ 3 ký tự, kiểm trước khi chiếm yêu cầu (không đổi trạng thái khi thiếu).
    const lyDo = chuanHoaLyDoTuChoi(lyDoTuChoi);
    if (!lyDo.ok) return { success: false, error: lyDo.error };
    const { req, actorAuthUserId } = await chiemYeuCau(id, "TU_CHOI", lyDo.value);
    await logAdminAction({
      action: "VST_REJECT_ADJUST_REQUEST",
      targetTable: BANG,
      targetId: String(req.id),
      before: { trang_thai: "CHO_DUYET" },
      after: { trang_thai: "TU_CHOI" },
      reason: lyDo.value,
      actorUserId: actorAuthUserId,
    });
    revalidatePath("/phe-duyet");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: vstWriteErrorMessage(error) };
  }
}
