import type { SupabaseClient } from "@supabase/supabase-js";
import { washAllowsAdvanceToQc } from "@/lib/domain/cssd-wash-gate";
import { evaluateHeatCompatibility, type BomItem } from "@/lib/domain/cssd-packaging-rules";
import { packConfirmBlockedByHeatSplit, resolveHeatSplitStatus } from "@/lib/domain/cssd-heat-split-status";
import { loadBomLinesWithLoaiSpec } from "../../shared/application/cssd-quy-trinh-bom";
import { normalizeSpaulding, normalizeSteamMethod } from "../../shared/domain/cssd-quy-trinh-bom";

export async function assertWashAllowsQc(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("metadata")
    .eq("id", quyTrinhId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const meta = (data as { metadata?: Record<string, unknown> } | null)?.metadata || {};
  const gate = washAllowsAdvanceToQc(meta.wash);
  if (!gate.ok) throw new Error(gate.message);
}

export async function assertHeatSplitForDongGoi(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<void> {
  const loaded = await loadBomLinesWithLoaiSpec(supabase, quyTrinhId);
  if (!loaded.ok) return;
  const items: BomItem[] = loaded.bomLines.map((row) => ({
    loai_id: row.loai_id,
    ten: row.ten_dung_cu_le,
    so_luong_ke_hoach: row.so_luong_ke_hoach,
    so_luong_thuc_te: row.so_luong_thuc_te,
    is_chiu_nhiet: row.is_chiu_nhiet,
    phan_loai_spaulding: normalizeSpaulding(row.phan_loai_spaulding),
    phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(row.phuong_phap_tiet_khuan_chi_dinh),
  }));
  const heat = evaluateHeatCompatibility(items);
  const { data: qt } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("ma_vai_tro_bo")
    .eq("id", quyTrinhId)
    .maybeSingle();
  const { count } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id", { count: "exact", head: true })
    .eq("quy_trinh_cha_id", quyTrinhId)
    .eq("ma_vai_tro_bo", "SUB")
    .eq("is_active", true);
  const status = resolveHeatSplitStatus({
    requireSplit: heat.requireSplit,
    maVaiTroBo: (qt as { ma_vai_tro_bo?: string | null } | null)?.ma_vai_tro_bo,
    hasActiveSub: (count || 0) > 0,
  });
  const block = packConfirmBlockedByHeatSplit(status);
  if (block.blocked) throw new Error(block.reason || heat.reason);
}
