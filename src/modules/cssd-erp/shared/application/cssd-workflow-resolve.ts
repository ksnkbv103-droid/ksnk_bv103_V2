import type { SupabaseClient } from "@supabase/supabase-js";
import { quyTrinhIdsWithEffectiveRedAlert } from "@/modules/cssd-su-co/domain/cssd-incident-attributes";
import { normalizeCssdCode } from "../domain/cssd-qr-core";
import { resolveCssdCodeWithClient } from "./cssd-qr-hub";

async function attachRedAlertFromSuCo(
  supabase: SupabaseClient,
  row: Record<string, unknown> | null,
  quyTrinhId: string,
): Promise<Record<string, unknown> | null> {
  if (!row) return null;
  const { data: suCoRows } = await supabase
    .from("cssd_fact_su_co")
    .select("quy_trinh_id, is_active, is_red_alert, attributes")
    .eq("quy_trinh_id", quyTrinhId)
    .eq("is_red_alert", true)
    .eq("is_active", true);
  const redIds = quyTrinhIdsWithEffectiveRedAlert(suCoRows ?? []);
  return { ...row, is_red_alert: redIds.has(quyTrinhId) };
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

/** Quy trình active mới nhất khớp mã quét — ủy quyền QR Hub (SSOT). */
export async function fetchActiveQuyTrinhByScanCode(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<Record<string, unknown> | null> {
  const code = normalizeCssdCode(rawCode);
  if (!code) return null;

  const resolved = await resolveCssdCodeWithClient(supabase, code);
  if (resolved.targetType !== "INSTRUMENT_SET" || !resolved.workflowId) return null;
  const row = await fetchQuyTrinhFullById(supabase, resolved.workflowId);
  return attachRedAlertFromSuCo(supabase, row, resolved.workflowId);
}
