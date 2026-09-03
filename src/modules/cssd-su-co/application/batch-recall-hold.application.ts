import type { SupabaseClient } from "@supabase/supabase-js";
import { buildQuyTrinhTramPatch } from "@/modules/cssd-erp/lib/cssd-tram-persist";
import { insertCssdLifecycleEvent } from "@/modules/cssd-erp/shared/application/cssd-lifecycle-events";
import { mapFkError, tableHasColumn } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { nextMachineStatusAfterBatchQcFail, recallTargetStationForLotMember } from "../domain/cssd-batch-recall";

type LotMemberRow = {
  id: string;
  ma_trang_thai_hien_tai?: string | null;
};

export async function applyBatchRecallAndHoldMachine(
  supabase: SupabaseClient,
  args: {
    loTietKhuanId: string;
    skipQuyTrinhId?: string | null;
    holdMachineQc: boolean;
    detectionStation: string;
    typeTen: string;
    desc?: string;
    reporterEmail?: string | null;
    reporterAuthUserId?: string | null;
  },
): Promise<{ recalledIds: string[]; machineHeld: boolean; machineId: string | null }> {
  const loId = String(args.loTietKhuanId || "").trim();
  const skipId = String(args.skipQuyTrinhId || "").trim();
  const recalledIds: string[] = [];
  if (!loId) return { recalledIds, machineHeld: false, machineId: null };

  const { data: members, error: memErr } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select("id, ma_trang_thai_hien_tai")
    .eq("lo_tiet_khuan_id", loId);
  if (memErr) throw new Error("Lỗi đọc bộ cùng mẻ: " + memErr.message);

  const hasDongBang = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_dong_bang");
  const now = new Date().toISOString();

  for (const raw of members || []) {
    const row = raw as LotMemberRow;
    const id = String(row.id || "").trim();
    if (!id || (skipId && id === skipId)) continue;

    const target = recallTargetStationForLotMember(row.ma_trang_thai_hien_tai);
    const tramPatch = await buildQuyTrinhTramPatch(supabase, target);
    const patch: Record<string, unknown> = {
      ...tramPatch,
      lo_tiet_khuan_id: null,
      updated_at: now,
    };
    if (hasDongBang && target === "DONG_GOI") patch.is_dong_bang = true;

    const { error: upErr } = await supabase.from("cssd_fact_quy_trinh").update(patch).eq("id", id);
    if (upErr) throw new Error(mapFkError(upErr.message));

    const lc = await insertCssdLifecycleEvent(supabase, {
      quy_trinh_id: id,
      ma_su_kien: "SU_CO_BATCH_RECALL",
      ma_tram: args.detectionStation,
      ghi_chu: `Thu hồi mẻ: ${args.typeTen} → ${target}`,
      payload: {
        lo_tiet_khuan_id: loId,
        rollback: { targetStation: target },
        mo_ta: args.desc,
        reporter_email: args.reporterEmail,
        reporter_user_id: args.reporterAuthUserId,
      },
    });
    if (!lc.ok && !/fact_cssd_lifecycle_event|does not exist/i.test(lc.message)) throw new Error(lc.message);
    recalledIds.push(id);
  }

  let machineHeld = false;
  let machineId: string | null = null;
  if (args.holdMachineQc) {
    const { data: meRow, error: meErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("thiet_bi_id")
      .eq("id", loId)
      .maybeSingle();
    if (meErr) throw new Error("Lỗi đọc máy mẻ: " + meErr.message);
    machineId = String((meRow as { thiet_bi_id?: string | null } | null)?.thiet_bi_id || "").trim() || null;
    if (machineId) {
      const { data: tb, error: tbErr } = await supabase
        .from("cssd_dm_thiet_bi")
        .select("id, trang_thai")
        .eq("id", machineId)
        .maybeSingle();
      if (tbErr) throw new Error("Lỗi đọc trạng thái máy: " + tbErr.message);
      const next = nextMachineStatusAfterBatchQcFail(
        (tb as { trang_thai?: string | null } | null)?.trang_thai,
      );
      if (next) {
        const { error: holdErr } = await supabase
          .from("cssd_dm_thiet_bi")
          .update({ trang_thai: next, updated_at: now })
          .eq("id", machineId);
        if (holdErr) throw new Error(mapFkError(holdErr.message));
        machineHeld = true;
      }
    }
  }

  return { recalledIds, machineHeld, machineId };
}
