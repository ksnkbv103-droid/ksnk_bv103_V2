/**
 * SC-06: tạo việc QLCV theo dõi NB khi thu hồi có bộ đã dùng.
 * Soft-fail — không chặn thu hồi nếu QLCV lỗi / thiếu cấu hình.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { insertQlcvTaskRow } from "@/modules/quan-ly-cong-viec/lib/qlcv-create-task";
import { resolveKsnkKhoaId } from "@/modules/quan-ly-cong-viec/lib/qlcv-ksnk-server";
import type { BatchRecallListItem } from "./batch-recall-hold.application";

export async function spawnRecallFollowupQlcvTask(
  supabase: SupabaseClient,
  opts: {
    incidentId: string;
    loTietKhuanId: string;
    maLo?: string | null;
    listedUsed: readonly BatchRecallListItem[];
  },
): Promise<{ taskId: string | null; error?: string }> {
  if (!opts.listedUsed.length) return { taskId: null };
  try {
    const ksnkKhoaId = await resolveKsnkKhoaId(supabase);
    const actor = (await getActorNhanSuId()) || "";
    if (!actor) {
      return { taskId: null, error: "Thiếu nhân sự để tạo việc theo dõi." };
    }
    const lines = opts.listedUsed
      .map((x, i) => {
        const usedAt = x.usedClinicallyAt || "—";
        const ca = x.maCaMoId ? ` · ca ${x.maCaMoId}` : "";
        return `${i + 1}. ${x.maBo || "—"} (${x.maLo || opts.maLo || "—"}) dùng ${usedAt}${ca}`;
      })
      .join("\n");
    const row = await insertQlcvTaskRow(supabase, {
      tieu_de: `Theo dõi NB — thu hồi mẻ ${opts.maLo || opts.loTietKhuanId.slice(0, 8)}`,
      mo_ta:
        `Thu hồi CSSD có ${opts.listedUsed.length} bộ đã dùng lâm sàng.\n` +
        `Phiếu SC: ${opts.incidentId}\nMẻ: ${opts.loTietKhuanId}\n\n${lines}\n\n` +
        `Lập danh sách NB / thủ thuật / thời điểm theo QT.24 HD.01.`,
      loai_cong_viec: "KHAN_CAP",
      muc_do_uu_tien: "CAO",
      ksnkKhoaId,
      is_active: true,
      nguoi_tao_id: actor,
      dia_diem_khoa_id: ksnkKhoaId,
      analytics_meta: {
        chi_so: "CSSD_RECALL_USED_FOLLOWUP",
        khoa_id: ksnkKhoaId,
        ky_do_lai: opts.incidentId,
        gia_tri_luc_tao: opts.listedUsed.length,
      },
    });
    const taskId = String((row as { id?: string }).id || "").trim() || null;
    if (taskId) {
      await supabase
        .from("cssd_fact_su_co")
        .select("id, attributes")
        .eq("id", opts.incidentId)
        .maybeSingle()
        .then(async ({ data }) => {
          if (!data) return;
          const attrs = ((data as { attributes?: Record<string, unknown> }).attributes || {}) as Record<
            string,
            unknown
          >;
          await supabase
            .from("cssd_fact_su_co")
            .update({
              attributes: { ...attrs, RECALL_FOLLOWUP_QLCV_ID: taskId },
              updated_at: new Date().toISOString(),
            })
            .eq("id", opts.incidentId);
        });
    }
    return { taskId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error({ module: "cssd-su-co", action: "spawnRecallFollowupQlcvTask", error: msg });
    return { taskId: null, error: msg };
  }
}
