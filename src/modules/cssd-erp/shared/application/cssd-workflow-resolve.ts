import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCssdCode } from "../domain/cssd-qr-core";

/** OR filter Supabase — 3 cột QR resolve (legacy + cycle + bộ vĩnh viễn). */
export function buildCssdQuyTrinhQrOrFilter(code: string): string {
  const c = normalizeCssdCode(code);
  return `ma_cycle_qr.eq.${c},ma_qr_bo_vinh_vien.eq.${c},ma_qr_quy_trinh.eq.${c}`;
}

/** Quy trình active mới nhất khớp mã quét (bất kỳ cột QR). */
export async function fetchActiveQuyTrinhByScanCode(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<Record<string, unknown> | null> {
  const code = normalizeCssdCode(rawCode);
  if (!code) return null;

  const { data: hit, error: hitErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id")
    .eq("is_active", true)
    .or(buildCssdQuyTrinhQrOrFilter(code))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (hitErr) throw new Error(hitErr.message);
  if (!hit?.id) return null;

  const { data: full, error: fullErr } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select("*")
    .eq("id", hit.id)
    .maybeSingle();
  if (fullErr) throw new Error(fullErr.message);
  return (full as Record<string, unknown> | null) ?? null;
}
