"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { formatVstKhoaFkViolation, vstWriteErrorMessage } from "./vst-write.helpers";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import {
  isSupervisionSessionMutationExpired,
  SUPERVISION_SESSION_MUTATION_EXPIRED_VI,
} from "@/lib/supervision-mutation-window";

const VST_OWNER_ONLY_VI = "Chỉ người giám sát đã ghi nhận phiên này mới được sửa hoặc xóa.";

/** Xóa cứng phiên VST và toàn bộ cơ hội thuộc phiên. Chỉ chủ phiên; phiên còn active. */
export async function deleteVSTSessions(sessionIds: string[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "delete");
    const ids = (sessionIds || []).map(String).filter(Boolean);
    if (!ids.length) return { success: true };

    const adminBypass = await hasRBACAdminSupervisionBypass();
    const actorNhanSuId = await getActorNhanSuId();
    if (!adminBypass && !actorNhanSuId) {
      return { success: false, error: "Không xác định được người giám sát của bạn." };
    }

    const { data: rows, error: qErr } = await supabase
      .from("fact_giam_sat_vst_sessions")
      .select("id,nguoi_giam_sat_id,is_active")
      .in("id", ids);
    if (qErr) throw qErr;

    const rowById = new Map((rows || []).map((r: { id?: string; nguoi_giam_sat_id?: string; is_active?: boolean }) => [String(r.id), r]));
    const missing = ids.filter((id) => !rowById.has(String(id)));
    if (missing.length) {
      return { success: false, error: "Phiên không còn tồn tại." };
    }

    if (!adminBypass) {
      const notOwner = ids.filter((id) => {
        const r = rowById.get(String(id));
        return String(r?.nguoi_giam_sat_id || "") !== String(actorNhanSuId);
      });
      if (notOwner.length) {
        return { success: false, error: VST_OWNER_ONLY_VI };
      }
    }

    const inactive = ids.filter((id) => {
      const r = rowById.get(String(id));
      if (typeof r?.is_active === "boolean") return r.is_active === false;
      return false;
    });
    if (inactive.length) {
      return { success: false, error: "Phiên đã bị vô hiệu, không xóa được theo luồng hiện tại." };
    }

    const { error: detailErr } = await supabase.from("fact_giam_sat_vst").delete().in("session_id", ids);
    if (detailErr) throw detailErr;
    const { error: sessionErr } = await supabase.from("fact_giam_sat_vst_sessions").delete().in("id", ids);
    if (sessionErr) throw sessionErr;
    revalidatePath("/giam-sat-vst/lich-su");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}

/**
 * Kiểm tra phiên VST có được phép mở form sửa hay không.
 * Chỉ chủ phiên; trong 30 phút sau `created_at`; phiên còn active.
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
      .from("fact_giam_sat_vst_sessions")
      .select("id,nguoi_giam_sat_id,is_active,created_at")
      .eq("id", id)
      .maybeSingle();

    if (qErr) throw qErr;
    if (!row) return { success: false as const, error: "Không tìm thấy phiên giám sát." };

    if (typeof row.is_active === "boolean" && row.is_active === false) {
      return { success: false as const, error: "Phiên đã bị vô hiệu, không sửa được." };
    }

    if (!adminBypass) {
      if (String(row.nguoi_giam_sat_id || "") !== String(actorNhanSuId)) {
        return { success: false as const, error: VST_OWNER_ONLY_VI };
      }

      if (isSupervisionSessionMutationExpired(row.created_at)) {
        return { success: false as const, error: SUPERVISION_SESSION_MUTATION_EXPIRED_VI };
      }
    }

    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatVstKhoaFkViolation(vstWriteErrorMessage(error)) };
  }
}
