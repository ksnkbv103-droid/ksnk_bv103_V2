"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { assertSupervisionNotLockedForDate } from "@/lib/supervision-module-lock";
import { revalidateGscPaths } from "../lib/revalidate-gsc-paths";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import {
  isSupervisionSessionMutationExpired,
  SUPERVISION_SESSION_MUTATION_EXPIRED_VI,
} from "@/lib/supervision-mutation-window";

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
  created_at?: string | null;
  ngay_giam_sat?: string | null;
};

/** Xóa hẳn phiên + kết quả tiêu chí trong DB. Chỉ chủ phiên; phiên còn active. */
export async function deleteGiamSatChungSessions(sessionIds: string[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "delete");
    const ids = (sessionIds || []).map(String).filter(Boolean);
    if (!ids.length) return { success: true as const };

    const adminBypass = await hasRBACAdminSupervisionBypass();
    const actorNhanSuId = await getActorNhanSuId();
    if (!adminBypass && !actorNhanSuId) {
      return { success: false as const, error: "Không xác định được người giám sát của bạn." };
    }

    const { data: rows, error: qErr } = await supabase
      .from("gstt_fact_chung_sessions")
      .select("id,nguoi_giam_sat_id,is_active,created_at,ngay_giam_sat")
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
      const expired = ids.filter((id) => {
        const r = rowById.get(String(id));
        return isSupervisionSessionMutationExpired(r?.created_at ?? null);
      });
      if (expired.length) {
        return { success: false as const, error: SUPERVISION_SESSION_MUTATION_EXPIRED_VI };
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

    const { error: sessionErr } = await supabase.from("gstt_fact_chung_sessions").delete().in("id", ids);
    if (sessionErr) throw sessionErr;

    revalidateGscPaths();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

/**
 * Kiểm tra phiên có được phép mở form sửa hay không.
 * Chỉ chủ phiên; trong 30 phút sau `created_at`; phiên còn active.
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
      .select("id,nguoi_giam_sat_id,is_active,created_at")
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

      if (isSupervisionSessionMutationExpired(row.created_at)) {
        return { success: false as const, error: SUPERVISION_SESSION_MUTATION_EXPIRED_VI };
      }
    }

    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
