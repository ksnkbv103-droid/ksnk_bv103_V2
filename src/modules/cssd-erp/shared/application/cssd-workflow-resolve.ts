import type { SupabaseClient } from "@supabase/supabase-js";
import { isCssdUnifiedBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { normalizeCssdCode } from "../domain/cssd-qr-core";

/** OR filter Supabase — QR bộ / chu trình / cycle. */
export function buildCssdQuyTrinhQrOrFilter(code: string): string {
  const c = normalizeCssdCode(code);
  return `ma_cycle_qr.eq.${c},ma_qr_bo_vinh_vien.eq.${c},ma_qr_quy_trinh.eq.${c}`;
}

async function fetchQuyTrinhFullById(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<Record<string, unknown> | null> {
  const { data: full, error: fullErr } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select("*")
    .eq("id", quyTrinhId)
    .maybeSingle();
  if (fullErr) throw new Error(fullErr.message);
  return (full as Record<string, unknown> | null) ?? null;
}

/** Fallback: quét trực tiếp ma_bo danh mục khi cột QR chưa đồng bộ. */
async function fetchActiveQuyTrinhByBoMaCatalog(
  supabase: SupabaseClient,
  code: string,
): Promise<Record<string, unknown> | null> {
  if (!isCssdUnifiedBoMa(code) && !code.endsWith("-SUB")) return null;

  const { data: bo, error: boErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id")
    .eq("ma_bo", normalizeBoMa(code))
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (boErr) throw new Error(boErr.message);
  if (!bo?.id) return null;

  const { data: qt, error: qtErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id")
    .eq("bo_dung_cu_id", String(bo.id))
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (qtErr) throw new Error(qtErr.message);
  if (!qt?.id) return null;

  return fetchQuyTrinhFullById(supabase, String(qt.id));
}

/** Quy trình active mới nhất khớp mã quét (bất kỳ cột QR hoặc ma_bo danh mục). */
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
  if (hit?.id) {
    return fetchQuyTrinhFullById(supabase, String(hit.id));
  }

  return fetchActiveQuyTrinhByBoMaCatalog(supabase, code);
}
