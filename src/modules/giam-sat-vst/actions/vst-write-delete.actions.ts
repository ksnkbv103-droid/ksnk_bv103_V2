"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
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

const VST_OWNER_ONLY_VI = "Chỉ người giám sát đã ghi nhận phiên này mới được sửa hoặc xóa.";

export type DeleteVSTSessionsOpts = {
  /** Bắt buộc khi xóa (VST-05 / QT.07 lưu ≥3 năm). */
  lyDo?: string | null;
};

/** Xóa mềm phiên VST (`is_active=false` + lý do + nhật ký). Không xóa cứng cơ hội. */
export async function deleteVSTSessions(sessionIds: string[], opts?: DeleteVSTSessionsOpts) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "delete");
    const ids = (sessionIds || []).map(String).filter(Boolean);
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

    const { data: rows, error: qErr } = await supabase
      .from("gstt_fact_vst_sessions")
      .select("id,nguoi_giam_sat_id,is_active,created_at,ngay_giam_sat")
      .in("id", ids);
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
    } else if (expired.length && lyDo.length < 3) {
      return { success: false, error: "Sau 30 phút chỉ Admin được xóa và phải ghi lý do." };
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
    for (const row of ngayRows) {
      await assertSupervisionNotLockedForDate(supabase, "VST", row.ngay_giam_sat ?? null);
    }

    const nowIso = new Date().toISOString();
    const { error: sessionErr } = await supabase
      .from("gstt_fact_vst_sessions")
      .update({
        is_active: false,
        deleted_at: nowIso,
        deleted_by: actorNhanSuId || actorAuthUserId || null,
        ly_do_xoa: lyDo,
        updated_at: nowIso,
      })
      .in("id", ids);
    if (sessionErr) throw sessionErr;

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
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "edit");

    const id = String(sessionId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã phiên." };

    const adminBypass = await hasRBACAdminSupervisionBypass();
    const actorNhanSuId = await getActorNhanSuId();
    if (!adminBypass && !actorNhanSuId) return { success: false as const, error: "Không xác định được người giám sát của bạn." };

    const { data: row, error: qErr } = await supabase
      .from("gstt_fact_vst_sessions")
      .select("id,nguoi_giam_sat_id,is_active,created_at")
      .eq("id", id)
      .maybeSingle();

    if (qErr) throw qErr;
    if (!row) return { success: false as const, error: "Không tìm thấy phiên giám sát." };

    if (typeof row.is_active === "boolean" && row.is_active === false) {
      return { success: false as const, error: "Phiên đã bị vô hiệu, không sửa được." };
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
