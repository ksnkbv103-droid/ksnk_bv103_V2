import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCssdCode } from "../domain/cssd-qr-core";
import { resolveCssdCodeWithClient } from "./cssd-qr-hub";

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
  return fetchQuyTrinhFullById(supabase, resolved.workflowId);
}
