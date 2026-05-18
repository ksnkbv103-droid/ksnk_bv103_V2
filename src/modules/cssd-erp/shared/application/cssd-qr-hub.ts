import type { SupabaseClient } from "@supabase/supabase-js";
import { tableHasColumn } from "../cssd-db-utils";
import { classifyCssdCode, normalizeCssdCode } from "../domain/cssd-qr-core";
import { cssdQrHubResolvedSchema, type CssdQrHubResolved } from "../contracts/cssd-qr-hub.contracts";

export async function resolveCssdCodeWithClient(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<CssdQrHubResolved> {
  const code = normalizeCssdCode(rawCode);
  if (!code) {
    throw new Error("Thiếu mã quét.");
  }

  const preClassified = classifyCssdCode(code);

  const workflowResult = await supabase
    .from("fact_quy_trinh")
    .select("id")
    .eq("ma_qr_quy_trinh", code)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (workflowResult.error) throw new Error(workflowResult.error.message);
  if (workflowResult.data?.id) {
    return cssdQrHubResolvedSchema.parse({
      targetType: "INSTRUMENT_SET",
      code,
      workflowId: String(workflowResult.data.id),
    });
  }

  const hasMachineQrColumn = await tableHasColumn(supabase, "dm_thiet_bi", "ma_qr_thiet_bi");
  let machineQuery = supabase
    .from("dm_thiet_bi")
    .select("id, ma_thiet_bi")
    .eq("is_active", true)
    .eq("ma_thiet_bi", code)
    .limit(1)
    .maybeSingle();
  if (hasMachineQrColumn) {
    machineQuery = supabase
      .from("dm_thiet_bi")
      .select("id, ma_thiet_bi")
      .eq("is_active", true)
      .or(`ma_thiet_bi.eq.${code},ma_qr_thiet_bi.eq.${code}`)
      .limit(1)
      .maybeSingle();
  }
  const machineResult = await machineQuery;
  if (machineResult.error) throw new Error(machineResult.error.message);
  if (machineResult.data?.id) {
    return cssdQrHubResolvedSchema.parse({
      targetType: "MACHINE",
      code,
      machineId: String(machineResult.data.id),
      machineCode: String((machineResult.data as { ma_thiet_bi?: string | null }).ma_thiet_bi || ""),
    });
  }

  return cssdQrHubResolvedSchema.parse({
    targetType: preClassified,
    code,
  });
}
