import type { SupabaseClient } from "@supabase/supabase-js";
import type { BomItem } from "@/lib/domain/cssd-packaging-rules";
import { loadBomLinesWithLoaiSpec } from "../shared/application/cssd-quy-trinh-bom";
import { normalizeSpaulding, normalizeSteamMethod } from "../shared/domain/cssd-quy-trinh-bom";
import { evaluateBatchSterilizationHeatRisk, type BatchHeatRisk } from "../lib/me-tiet-khuan-batch-heat";

export async function evaluateBatchHeatWithClient(
  supabase: SupabaseClient,
  batchId: string,
): Promise<{ ok: true; risk: BatchHeatRisk } | { ok: false; message: string }> {
  const id = String(batchId || "").trim();
  if (!id) return { ok: false, message: "Thiếu mã mẻ." };

  const { data: me, error: meErr } = await supabase
    .from("cssd_fact_lo_tiet_khuan")
    .select(
      "id, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi, loai_may_id, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may))",
    )
    .eq("id", id)
    .maybeSingle();
  if (meErr) return { ok: false, message: meErr.message };
  if (!me) return { ok: false, message: "Không tìm thấy mẻ." };

  const { data: rows, error: qErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id")
    .eq("lo_tiet_khuan_id", id)
    .eq("is_active", true);
  if (qErr) return { ok: false, message: qErr.message };

  const bomItems: BomItem[] = [];
  for (const qt of rows || []) {
    const loaded = await loadBomLinesWithLoaiSpec(supabase, String((qt as { id: string }).id));
    if (!loaded.ok) return { ok: false, message: loaded.message };
    for (const row of loaded.bomLines) {
      bomItems.push({
        loai_id: row.loai_id,
        ten: row.ten_dung_cu_le,
        so_luong_ke_hoach: row.so_luong_ke_hoach,
        so_luong_thuc_te: row.so_luong_thuc_te,
        is_chiu_nhiet: row.is_chiu_nhiet,
        phan_loai_spaulding: normalizeSpaulding(row.phan_loai_spaulding),
        phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(row.phuong_phap_tiet_khuan_chi_dinh),
      });
    }
  }

  const tb = (me as { thiet_bi?: { ten_thiet_bi?: string; loai_may?: { ten_loai_may?: string; ma_loai_may?: string } } })
    .thiet_bi;
  const risk = evaluateBatchSterilizationHeatRisk(bomItems, {
    loai_thiet_bi: tb?.ten_thiet_bi || tb?.loai_may?.ma_loai_may || null,
    loai_ten_hien_thi: tb?.loai_may?.ten_loai_may || null,
  });
  return { ok: true, risk };
}

export function batchHeatBlockMessage(risk: BatchHeatRisk): string | null {
  if (risk.level !== "BLOCK") return null;
  return risk.messages.join(" ") || "Chặn nhiệt: bộ lẫn chịu nhiệt / không chịu nhiệt trên máy hấp hơi.";
}
