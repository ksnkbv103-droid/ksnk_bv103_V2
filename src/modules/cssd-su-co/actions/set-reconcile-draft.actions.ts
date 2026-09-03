"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyCssdIncidentCreate } from "@/lib/cssd-server-gates";
import { SET_RECONCILE_TYPE_ID } from "@/lib/domain/cssd-set-reconcile";
import { buildSetReconcileAttributePatch } from "../domain/cssd-set-reconcile-attrs";
import {
  findBlockingDraft,
  loadSetReconcileIncidentsForBo,
} from "../application/set-reconcile-incident.application";
import { isSetReconcileDraftExpired } from "@/lib/domain/cssd-set-reconcile";
import { readSetReconcileStatus } from "../domain/cssd-set-reconcile-attrs";

async function reporterAuthId(): Promise<string | null> {
  try {
    const uc = await createServerSupabaseUserClient();
    const u = await uc.auth.getUser();
    return u.data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function claimSetReconcileDraftAction(input: {
  boDungCuId: string;
  maBo?: string;
  station?: string;
}) {
  try {
    await verifyCssdIncidentCreate();
    const boId = String(input.boDungCuId || "").trim();
    if (!boId) return { success: false as const, error: "Thiếu bộ dụng cụ." };
    const supabase = createAdminSupabaseClient();
    const authId = await reporterAuthId();
    const rows = await loadSetReconcileIncidentsForBo(supabase, boId);
    for (const row of rows) {
      const st = readSetReconcileStatus(row.attributes || {});
      if (st !== "DRAFT") continue;
      if (!isSetReconcileDraftExpired(String(row.created_at || ""))) continue;
      await supabase.from("cssd_fact_su_co").delete().eq("id", row.id);
    }
    const fresh = await loadSetReconcileIncidentsForBo(supabase, boId);
    const blocking = findBlockingDraft(fresh, boId, authId);
    if (blocking && !blocking.sameUser) {
      return { success: false as const, error: "Bộ này đang được nhân viên khác rà soát. Thử lại sau khi họ gửi hoặc hủy phiếu." };
    }
    if (blocking?.sameUser) return { success: true as const, draftId: blocking.id };

    const attrs = buildSetReconcileAttributePatch({
      boDungCuId: boId,
      status: "DRAFT",
      snapshot: { boDungCuId: boId, maBo: input.maBo, lines: [] },
    });
    if (authId) attrs.REPORTER_AUTH_USER_ID = authId;
    const { data, error } = await supabase
      .from("cssd_fact_su_co")
      .insert({
        ma_qr_quy_trinh: String(input.maBo || "").trim() || null,
        ma_tram_phat_hien: input.station || "DONG_GOI",
        mo_ta: "Nháp rà soát bộ dụng cụ",
        attributes: { ...attrs, INCIDENT_GROUP: "INSTRUMENT", INCIDENT_TYPE_CODE: SET_RECONCILE_TYPE_ID },
      })
      .select("id")
      .single();
    if (error || !data?.id) return { success: false as const, error: error?.message || "Không tạo được phiếu nháp." };
    return { success: true as const, draftId: String(data.id) };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không mở phiếu rà soát." };
  }
}

export async function releaseSetReconcileDraftAction(draftId: string) {
  try {
    await verifyCssdIncidentCreate();
    const id = String(draftId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu phiếu nháp." };
    const supabase = createAdminSupabaseClient();
    const { data } = await supabase.from("cssd_fact_su_co").select("id, attributes").eq("id", id).maybeSingle();
    if (!data) return { success: true as const };
    if (readSetReconcileStatus((data.attributes as Record<string, unknown>) || {}) !== "DRAFT") {
      return { success: true as const };
    }
    await supabase.from("cssd_fact_su_co").delete().eq("id", id);
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không hủy phiếu nháp." };
  }
}
