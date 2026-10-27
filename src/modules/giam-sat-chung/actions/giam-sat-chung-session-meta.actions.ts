"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { assertSupervisionNotLockedForDate } from "@/lib/supervision-module-lock";
import { revalidateGscPaths } from "../lib/revalidate-gsc-paths";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { getActorAuthUserId, getActorNhanSuId } from "@/lib/actor-auth-server";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeSessionIds } from "@/lib/normalize-session-ids";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
  }
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

const GSC_OWNER_ONLY_VI = "Chỉ người giám sát đã ghi nhận phiên này mới được sửa hoặc xóa.";

type GscSessionMutRow = {
  id: string;
  nguoi_giam_sat_id?: string | null;
  is_active?: boolean | null;
  ngay_giam_sat?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type DeleteGiamSatChungSessionsOpts = {
  /** Bắt buộc khi xóa (QT.07 lưu hồ sơ ≥3 năm) — ghi vào `metadata.xoa` + nhật ký quản trị. */
  lyDo?: string | null;
};

/**
 * Xóa mềm phiên GSC (`is_active=false` + lý do trong `metadata.xoa` + nhật ký). Không xóa cứng.
 * Chỉ chủ phiên (hoặc admin giám sát); phiên còn active; ngày chưa khóa sổ.
 */
export async function deleteGiamSatChungSessions(sessionIds: string[], opts?: DeleteGiamSatChungSessionsOpts) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "delete");
    const norm = normalizeSessionIds(sessionIds);
    if (!norm.ok) return { success: false as const, error: norm.error };
    const ids = norm.ids;
    if (!ids.length) return { success: true as const };

    const lyDo = String(opts?.lyDo ?? "").trim();
    if (lyDo.length < 3) {
      return { success: false as const, error: "Vui lòng nhập lý do xóa (tối thiểu 3 ký tự)." };
    }

    const adminBypass = await hasRBACAdminSupervisionBypass();
    const actorNhanSuId = await getActorNhanSuId();
    if (!adminBypass && !actorNhanSuId) {
      return { success: false as const, error: "Không xác định được người giám sát của bạn." };
    }

    const { data: rows, error: qErr } = await supabase
      .from("gstt_fact_chung_sessions")
      .select("id,nguoi_giam_sat_id,is_active,ngay_giam_sat,metadata")
      .in("id", ids);
    if (qErr) throw qErr;

    const rowById = new Map((rows || []).map((r: GscSessionMutRow) => [String(r.id), r]));
    const missing = ids.filter((id) => !rowById.has(String(id)));
    if (missing.length) {
      return { success: false as const, error: "Phiên không còn tồn tại." };
    }

    if (!adminBypass) {
      const notOwner = ids.filter((id) => {
        const r = rowById.get(String(id));
        return String(r?.nguoi_giam_sat_id || "") !== String(actorNhanSuId);
      });
      if (notOwner.length) {
        return { success: false as const, error: GSC_OWNER_ONLY_VI };
      }
    }

    const inactive = ids.filter((id) => rowById.get(String(id))?.is_active === false);
    if (inactive.length) {
      return { success: false as const, error: "Phiên đã bị vô hiệu, không xóa được theo luồng hiện tại." };
    }

    for (const id of ids) {
      const r = rowById.get(String(id));
      await assertSupervisionNotLockedForDate(
        supabase,
        "GSC",
        r?.ngay_giam_sat ? String(r.ngay_giam_sat).slice(0, 10) : null,
      );
    }

    const actorAuthUserId = await getActorAuthUserId();
    const nowIso = new Date().toISOString();
    for (const id of ids) {
      const before = rowById.get(String(id));
      const prevMeta =
        before?.metadata && typeof before.metadata === "object" ? before.metadata : {};
      const { error: sessionErr } = await supabase
        .from("gstt_fact_chung_sessions")
        .update({
          is_active: false,
          metadata: {
            ...prevMeta,
            xoa: { ly_do: lyDo, luc: nowIso, boi_nhan_su_id: actorNhanSuId || null, boi_auth_user_id: actorAuthUserId || null },
          },
          updated_at: nowIso,
        })
        .eq("id", id)
        .eq("is_active", true);
      if (sessionErr) throw sessionErr;

      await logAdminAction({
        action: "GSC_SOFT_DELETE_SESSION",
        targetTable: "gstt_fact_chung_sessions",
        targetId: String(id),
        before: { is_active: true, nguoi_giam_sat_id: before?.nguoi_giam_sat_id ?? null, ngay_giam_sat: before?.ngay_giam_sat ?? null },
        after: { is_active: false, ly_do_xoa: lyDo },
        reason: lyDo,
        actorUserId: actorAuthUserId,
      });
    }

    revalidateGscPaths();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

/**
 * Kiểm tra phiên có được phép mở form sửa hay không.
 * Chỉ chủ phiên; phiên còn active; chặn khi ngày đã khóa sổ.
 */
export async function assertCanEditGiamSatChungSession(sessionId: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "edit");

    const id = String(sessionId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã phiên." };

    const adminBypass = await hasRBACAdminSupervisionBypass();
    const actorNhanSuId = await getActorNhanSuId();
    if (!adminBypass && !actorNhanSuId) return { success: false as const, error: "Không xác định được người giám sát của bạn." };

    const { data: row, error: qErr } = await supabase
      .from("gstt_fact_chung_sessions")
      .select("id,nguoi_giam_sat_id,is_active,ngay_giam_sat")
      .eq("id", id)
      .maybeSingle();

    if (qErr) throw qErr;
    if (!row) return { success: false as const, error: "Không tìm thấy phiên giám sát." };

    if (row.is_active === false) {
      return { success: false as const, error: "Phiên đã bị vô hiệu, không sửa được." };
    }

    if (!adminBypass) {
      if (String(row.nguoi_giam_sat_id || "") !== String(actorNhanSuId)) {
        return { success: false as const, error: GSC_OWNER_ONLY_VI };
      }
    }

    await assertSupervisionNotLockedForDate(
      supabase,
      "GSC",
      row.ngay_giam_sat ? String(row.ngay_giam_sat).slice(0, 10) : null,
    );

    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
