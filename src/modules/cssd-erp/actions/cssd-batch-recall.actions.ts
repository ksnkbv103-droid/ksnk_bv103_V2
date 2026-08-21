"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyCssdBatchEdit } from "@/lib/cssd-server-gates";
import { buildQuyTrinhTramPatch } from "../lib/cssd-tram-persist";
import { getErrorMessage, mapFkError, revalidateCssdBatchSurfaces, revalidateCssdWorkflowSurfaces, tableHasColumn, appendQuyTrinhException } from "./cssd-action-common";
import { buildIncidentAttributes } from "@/modules/cssd-su-co/domain/cssd-incident-attributes";
import { mergeQuyTrinhMetadata } from "../shared/application/cssd-quy-trinh-exceptions";

export async function recallCssdSterilizationBatch(batchId: string, lyDo?: string) {
  try {
    await verifyCssdBatchEdit();
    const supabase = createAdminSupabaseClient();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ." };

    const { data: me, error: meErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("id, ma_lo_tiet_khuan, ket_qua_test, tk_qc_json")
      .eq("id", id)
      .maybeSingle();
    if (meErr) return { success: false as const, error: mapFkError(meErr.message) };
    if (!me) return { success: false as const, error: "Không tìm thấy mẻ." };
    const ket = (me as { ket_qua_test?: boolean | null }).ket_qua_test;
    if (ket !== true && ket !== false) {
      return { success: false as const, error: "Chỉ thu hồi mẻ đã có kết quả QC (đạt hoặc không đạt)." };
    }
    const prevJson =
      (me as { tk_qc_json?: Record<string, unknown> | null }).tk_qc_json &&
      typeof (me as { tk_qc_json?: unknown }).tk_qc_json === "object"
        ? ((me as { tk_qc_json: Record<string, unknown> }).tk_qc_json as Record<string, unknown>)
        : {};
    if (prevJson.recalledAt) {
      return { success: false as const, error: "Mẻ này đã được thu hồi trước đó." };
    }

    const { data: members, error: memErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id, ma_qr_quy_trinh, metadata")
      .eq("lo_tiet_khuan_id", id)
      .eq("is_active", true);
    if (memErr) return { success: false as const, error: mapFkError(memErr.message) };
    const rows = (members || []) as Array<{ id: string; ma_qr_quy_trinh?: string | null; metadata?: Record<string, unknown> }>;
    if (!rows.length) return { success: false as const, error: "Không còn bộ nào gắn mẻ này." };

    let operator = "CSSD";
    try {
      const uc = await createServerSupabaseUserClient();
      const { data } = await uc.auth.getUser();
      operator = data.user?.email?.trim() || operator;
    } catch {
      /* demo */
    }

    const now = new Date().toISOString();
    const lyDoText = String(lyDo || "").trim() || "Thu hồi mẻ — kéo bộ về Tiếp nhận, khóa an toàn.";
    const tiepNhanPatch = await buildQuyTrinhTramPatch(supabase, "TIEP_NHAN");
    const hasFreeze = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_dong_bang");
    const hasRed = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_red_alert");
    const hasKhoaNhan = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "khoa_nhan_id");

    for (const row of rows) {
      const patch: Record<string, unknown> = {
        ...tiepNhanPatch,
        lo_tiet_khuan_id: null,
        updated_at: now,
      };
      if (hasKhoaNhan) patch.khoa_nhan_id = null;
      if (hasFreeze) patch.is_dong_bang = true;
      if (hasRed) patch.is_red_alert = true;
      const { error: upErr } = await supabase.from("cssd_fact_quy_trinh").update(patch).eq("id", row.id);
      if (upErr) return { success: false as const, error: mapFkError(upErr.message) };

      await mergeQuyTrinhMetadata(supabase, row.id, {
        recalled_from_lo_tiet_khuan_id: id,
        recall_banner: `Thu hồi mẻ ${(me as { ma_lo_tiet_khuan?: string }).ma_lo_tiet_khuan || id} — ${lyDoText}`,
      });

      const typeTen = "Thu hồi mẻ tiệt khuẩn";
      const attributes = buildIncidentAttributes({
        incidentGroup: "PROCESS",
        typeTen,
        incidentKind: "PROCESS_BATCH_RECALL",
        rollbackTargetStation: "TIEP_NHAN",
        faultOperator: operator,
        errorQR: String((me as { ma_lo_tiet_khuan?: string }).ma_lo_tiet_khuan || ""),
        loTietKhuanId: id,
        maLo: String((me as { ma_lo_tiet_khuan?: string }).ma_lo_tiet_khuan || ""),
      });
      await supabase.from("cssd_fact_su_co").insert({
        ma_qr_quy_trinh: row.ma_qr_quy_trinh,
        quy_trinh_id: row.id,
        ma_tram_phat_hien: "TIET_KHUAN",
        mo_ta: `Thu hồi mẻ ${(me as { ma_lo_tiet_khuan?: string }).ma_lo_tiet_khuan}. ${lyDoText}`,
        is_red_alert: true,
        ma_tram_gay_loi: "TIET_KHUAN",
        attributes,
      });
      await appendQuyTrinhException(supabase, row.id, {
        su_kien: "THU_HOI_ME_TIET_KHUAN",
        tu_tram: "CAP_PHAT",
        den_tram: "TIEP_NHAN",
        ly_do: lyDoText,
        nguoi_thao_tac: operator,
      });
    }

    const { error: loErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .update({
        tk_qc_json: { ...prevJson, recalledAt: now, recallLyDo: lyDoText, recalledBy: operator },
        updated_at: now,
      })
      .eq("id", id);
    if (loErr) return { success: false as const, error: mapFkError(loErr.message) };

    revalidateCssdBatchSurfaces();
    revalidateCssdWorkflowSurfaces();
    return { success: true as const, count: rows.length };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
