"use server";

import { isValidVstEditReason, VST_EDIT_REASON_MIN_CHARS } from "../lib/vst-edit-reason";
import { getDb } from "@/lib/data-access";
import { vstRepo } from "../repo/vst.repo";
import { revalidatePath } from "next/cache";
import { getActorRoleNames, hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { coVaiTroCanBoKsnk, quyetDinhDuongDieuChinhVst, quyetDinhSuaVst } from "../lib/vst-yeu-cau-dieu-chinh";
import { formatVstKhoaFkViolation, vstWriteErrorMessage } from "./vst-write.helpers";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import { isSupervisionSessionMutationExpired } from "@/lib/supervision-mutation-window";
import { assertSupervisionNotLockedForDate } from "@/lib/supervision-module-lock";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeSessionIds } from "@/lib/normalize-session-ids";

const VST_OWNER_ONLY_VI = "Chỉ người giám sát đã ghi nhận phiên này mới được sửa hoặc xóa.";

export type DeleteVSTSessionsOpts = {
  /** Bắt buộc khi xóa (VST-05 / QT.07 lưu ≥3 năm). */
  lyDo?: string | null;
};

/**
 * Xóa mềm phiên VST (`is_active=false` + lý do + nhật ký). Không xóa cứng cơ hội.
 * Chủ phiên trong 30 phút hoặc ADMIN: xóa ngay. Còn lại: tạo yêu cầu chờ duyệt (`choDuyet` = số yêu cầu).
 */
export async function deleteVSTSessions(sessionIds: string[], opts?: DeleteVSTSessionsOpts) {
  try {
    await verifyPermission("GIAM_SAT_VST", "delete");
    const norm = normalizeSessionIds(sessionIds);
    if (!norm.ok) return { success: false, error: norm.error };
    const ids = norm.ids;
    if (!ids.length) return { success: true, choDuyet: 0 };

    const lyDo = String(opts?.lyDo ?? "").trim();
    if (!isValidVstEditReason(lyDo)) {
      return { success: false, error: `Vui lòng nhập lý do xóa (tối thiểu ${VST_EDIT_REASON_MIN_CHARS} ký tự).` };
    }

    const adminBypass = await hasRBACAdminSupervisionBypass();
    const actorNhanSuId = await getActorNhanSuId();
    const actorAuthUserId = await getActorAuthUserId();
    if (!adminBypass && !actorNhanSuId) {
      return { success: false, error: "Không xác định được người giám sát của bạn." };
    }

    const { data: rows, error: qErr } = await vstRepo.findVstSessionsForDelete(ids);
    if (qErr) throw qErr;

    const rowById = new Map(
      (rows || []).map((r: { id?: string; nguoi_giam_sat_id?: string; is_active?: boolean; created_at?: string | null }) => [
        String(r.id),
        r,
      ]),
    );
    const missing = ids.filter((id) => !rowById.has(String(id)));
    if (missing.length) {
      return { success: false, error: "Phiên không còn tồn tại." };
    }

    const expired = ids.filter((id) => {
      const r = rowById.get(String(id)) as { created_at?: string | null } | undefined;
      return isSupervisionSessionMutationExpired(r?.created_at ?? null);
    });

    // @dac-ta R1.24, R1.25 — quá 30 phút hoặc không phải chủ phiên: tạo yêu cầu chờ chủ nhiệm khoa duyệt.
    const roles = adminBypass ? [] : await getActorRoleNames();
    const laCanBoKsnk = coVaiTroCanBoKsnk(roles);
    const expiredSet = new Set(expired.map(String));
    const duongTheoId = new Map(
      ids.map((id) => {
        const r = rowById.get(String(id)) as { nguoi_giam_sat_id?: string } | undefined;
        const laChuPhien = !!actorNhanSuId && String(r?.nguoi_giam_sat_id || "") === String(actorNhanSuId);
        return [
          String(id),
          quyetDinhDuongDieuChinhVst({ adminBypass, laChuPhien, quaHan: expiredSet.has(String(id)), laCanBoKsnk }),
        ] as const;
      }),
    );
    if ([...duongTheoId.values()].includes("TU_CHOI")) {
      return { success: false, error: VST_OWNER_ONLY_VI };
    }
    const requestIds = ids.filter((id) => duongTheoId.get(String(id)) === "YEU_CAU");
    const directIds = ids.filter((id) => duongTheoId.get(String(id)) === "TRUC_TIEP");
    if (requestIds.length && !actorAuthUserId) {
      return { success: false, error: "Không xác định được tài khoản của bạn." };
    }

    const inactive = ids.filter((id) => {
      const r = rowById.get(String(id));
      if (typeof r?.is_active === "boolean") return r.is_active === false;
      return false;
    });
    if (inactive.length) {
      return { success: false, error: "Phiên đã bị vô hiệu, không xóa lại được." };
    }

    const ngayRows = (rows || []) as Array<{ id?: string; ngay_giam_sat?: string | null }>;
    const db = await getDb("admin");
    for (const row of ngayRows) {
      await assertSupervisionNotLockedForDate(db, "VST", row.ngay_giam_sat ?? null);
    }

    if (requestIds.length) {
      const { error: reqErr } = await db.from("gstt_fact_vst_yeu_cau_dieu_chinh").insert(
        requestIds.map((id) => ({
          session_id: id,
          loai: "XOA",
          ly_do: lyDo,
          nguoi_yeu_cau_auth_id: actorAuthUserId,
          nguoi_yeu_cau_nhan_su_id: actorNhanSuId || null,
        })),
      );
      if (reqErr) {
        if ((reqErr as { code?: string }).code === "23505") {
          return { success: false, error: "Phiên đã có yêu cầu đang chờ duyệt." };
        }
        throw reqErr;
      }
    }
    if (!directIds.length) {
      revalidatePath("/phe-duyet");
      return { success: true, choDuyet: requestIds.length };
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: sessionErr } = await vstRepo.softDeleteVstSessions({
      ids: directIds,
      nowIso,
      deletedBy: actorNhanSuId || actorAuthUserId || null,
      lyDo,
    });
    if (sessionErr) throw sessionErr;
    if ((updated?.length ?? 0) !== directIds.length) {
      return { success: false, error: "Phiên đã bị vô hiệu hoặc thay đổi trước đó, vui lòng tải lại." };
    }

    for (const id of directIds) {
      const before = rowById.get(String(id));
      await logAdminAction({
        action: "VST_SOFT_DELETE_SESSION",
        targetTable: "gstt_fact_vst_sessions",
        targetId: String(id),
        before: before ? { ...before } : null,
        after: { is_active: false, ly_do_xoa: lyDo },
        reason: lyDo,
        actorUserId: actorAuthUserId,
      });
    }

    revalidatePath("/giam-sat-vst");
    revalidatePath("/lich-su/vst");
    const { invalidateVstStrategicAnalyticsCache } = await import(
      "@/lib/analytics/strategic-analytics-cache"
    );
    invalidateVstStrategicAnalyticsCache();
    return { success: true, choDuyet: requestIds.length };
  } catch (error: unknown) {
    return { success: false, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}

/**
 * Kiểm tra phiên VST có được phép mở form sửa hay không.
 * Chủ phiên trong 30 phút: sửa ngay. Sau 30 phút: chủ phiên gửi yêu cầu chờ duyệt, Admin sửa ngay (đều bắt lý do).
 */
export async function assertCanEditVSTSession(sessionId: string) {
  try {
    await verifyPermission("GIAM_SAT_VST", "edit");

    const id = String(sessionId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã phiên." };

    const adminBypass = await hasRBACAdminSupervisionBypass();
    const actorNhanSuId = await getActorNhanSuId();
    if (!adminBypass && !actorNhanSuId) return { success: false as const, error: "Không xác định được người giám sát của bạn." };

    const { data: row, error: qErr } = await vstRepo.findVstSessionForEdit(id);

    if (qErr) throw qErr;
    if (!row) return { success: false as const, error: "Không tìm thấy phiên giám sát." };

    if (typeof row.is_active === "boolean" && row.is_active === false) {
      return { success: false as const, error: "Phiên đã bị vô hiệu, không sửa được." };
    }

    if (row.ngay_giam_sat) {
      const db = await getDb("admin");
      await assertSupervisionNotLockedForDate(
        db,
        "VST",
        String(row.ngay_giam_sat).slice(0, 10),
      );
    }

    const expired = isSupervisionSessionMutationExpired(row.created_at);
    const laChuPhien = !!actorNhanSuId && String(row.nguoi_giam_sat_id || "") === String(actorNhanSuId);
    // @dac-ta R1.24 — chủ phiên quá 30 phút hoặc CB_KSNK (VST-027) vẫn mở được form; lưu sẽ thành yêu cầu chờ duyệt.
    const laCanBoKsnk = adminBypass ? false : coVaiTroCanBoKsnk(await getActorRoleNames());
    const { duong, guiYeuCau, canLyDo } = quyetDinhSuaVst({ adminBypass, laChuPhien, quaHan: expired, laCanBoKsnk });
    if (duong === "TU_CHOI") return { success: false as const, error: VST_OWNER_ONLY_VI };

    return {
      success: true as const,
      requiresReason: canLyDo,
      choDuyet: guiYeuCau,
    };
  } catch (error: unknown) {
    return { success: false as const, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}
