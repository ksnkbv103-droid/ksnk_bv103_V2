"use server";

import { getDb } from "@/lib/data-access";
import { vstRepo } from "../repo/vst.repo";
import { revalidatePath } from "next/cache";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { formatVstKhoaFkViolation, vstWriteErrorMessage } from "./vst-write.helpers";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import {
  isSupervisionSessionMutationExpired,
  SUPERVISION_SESSION_MUTATION_EXPIRED_VI,
} from "@/lib/supervision-mutation-window";
import { assertSupervisionNotLockedForDate } from "@/lib/supervision-module-lock";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeSessionIds } from "@/lib/normalize-session-ids";

const VST_OWNER_ONLY_VI = "Chỉ người giám sát đã ghi nhận phiên này mới được sửa hoặc xóa.";

export type DeleteVSTSessionsOpts = {
  /** Bắt buộc khi xóa (VST-05 / QT.07 lưu ≥3 năm). */
  lyDo?: string | null;
};

/** Xóa mềm phiên VST (`is_active=false` + lý do + nhật ký). Không xóa cứng cơ hội. */
export async function deleteVSTSessions(sessionIds: string[], opts?: DeleteVSTSessionsOpts) {
  try {
    await verifyPermission("GIAM_SAT_VST", "delete");
    const norm = normalizeSessionIds(sessionIds);
    if (!norm.ok) return { success: false, error: norm.error };
    const ids = norm.ids;
    if (!ids.length) return { success: true };

    const lyDo = String(opts?.lyDo ?? "").trim();
    if (lyDo.length < 3) {
      return { success: false, error: "Vui lòng nhập lý do xóa (tối thiểu 3 ký tự)." };
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

    if (!adminBypass) {
      const notOwner = ids.filter((id) => {
        const r = rowById.get(String(id)) as { nguoi_giam_sat_id?: string } | undefined;
        return String(r?.nguoi_giam_sat_id || "") !== String(actorNhanSuId);
      });
      if (notOwner.length) {
        return { success: false, error: VST_OWNER_ONLY_VI };
      }
      if (expired.length) {
        return { success: false, error: SUPERVISION_SESSION_MUTATION_EXPIRED_VI };
      }
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

    const nowIso = new Date().toISOString();
    const { data: updated, error: sessionErr } = await vstRepo.softDeleteVstSessions({
      ids,
      nowIso,
      deletedBy: actorNhanSuId || actorAuthUserId || null,
      lyDo,
    });
    if (sessionErr) throw sessionErr;
    if ((updated?.length ?? 0) !== ids.length) {
      return { success: false, error: "Phiên đã bị vô hiệu hoặc thay đổi trước đó, vui lòng tải lại." };
    }

    for (const id of ids) {
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
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}

/**
 * Kiểm tra phiên VST có được phép mở form sửa hay không.
 * Chủ phiên trong 30 phút; sau 30 phút chỉ Admin (bắt lý do khi lưu).
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
    if (!adminBypass) {
      if (String(row.nguoi_giam_sat_id || "") !== String(actorNhanSuId)) {
        return { success: false as const, error: VST_OWNER_ONLY_VI };
      }
      if (expired) {
        return { success: false as const, error: SUPERVISION_SESSION_MUTATION_EXPIRED_VI };
      }
    }

    return {
      success: true as const,
      requiresReason: Boolean(adminBypass && expired),
    };
  } catch (error: unknown) {
    return { success: false as const, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}
