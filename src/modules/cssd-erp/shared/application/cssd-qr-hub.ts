import type { SupabaseClient } from "@supabase/supabase-js";
import { isCssdSubBoMa, isCssdUnifiedBoMa, isRejectedLegacyHexBoQr, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { tableHasColumn } from "../cssd-db-utils";
import {
  buildCssdQuyTrinhQrOrFilter,
  classifyCssdCode,
  normalizeCssdCode,
} from "../domain/cssd-qr-core";
import { cssdQrHubResolvedSchema, type CssdQrHubResolved } from "../contracts/cssd-qr-hub.contracts";

async function resolveInstrumentSetByBoMaCatalog(
  supabase: SupabaseClient,
  code: string,
): Promise<{ workflowId?: string; boDungCuId: string } | null> {
  if (!isCssdUnifiedBoMa(code) && !isCssdSubBoMa(code)) return null;

  const { data: bo, error: boErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id")
    .eq("ma_bo", normalizeBoMa(code))
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (boErr) throw new Error(boErr.message);
  if (!bo?.id) return null;

  const boDungCuId = String(bo.id);
  const { data: qt, error: qtErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id")
    .eq("bo_dung_cu_id", boDungCuId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (qtErr) throw new Error(qtErr.message);

  return {
    boDungCuId,
    workflowId: qt?.id ? String(qt.id) : undefined,
  };
}

/** SSOT nhận diện mã quét CSSD — bộ / máy / mẻ. Mọi màn quét vận hành gọi qua đây. */
export async function resolveCssdCodeWithClient(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<CssdQrHubResolved> {
  const code = normalizeCssdCode(rawCode);
  if (!code) {
    throw new Error("Thiếu mã quét.");
  }
  if (isRejectedLegacyHexBoQr(code)) {
    throw new Error(
      `Mã ${code} là tem hex cũ — không còn hỗ trợ. In lại tem mã bộ (vd. B01.SET.01) từ danh mục CSSD.`,
    );
  }

  const preClassified = classifyCssdCode(code);

  if (preClassified === "STERILIZATION_BATCH") {
    const batchResult = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("id")
      .eq("ma_lo_tiet_khuan", code)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (batchResult.error) throw new Error(batchResult.error.message);
    if (batchResult.data?.id) {
      return cssdQrHubResolvedSchema.parse({
        targetType: "STERILIZATION_BATCH",
        code,
        batchId: String(batchResult.data.id),
      });
    }
  }

  const workflowResult = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id, bo_dung_cu_id")
    .eq("is_active", true)
    .or(buildCssdQuyTrinhQrOrFilter(code))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (workflowResult.error) throw new Error(workflowResult.error.message);
  if (workflowResult.data?.id) {
    const boId = workflowResult.data.bo_dung_cu_id
      ? String(workflowResult.data.bo_dung_cu_id)
      : undefined;
    return cssdQrHubResolvedSchema.parse({
      targetType: "INSTRUMENT_SET",
      code,
      workflowId: String(workflowResult.data.id),
      boDungCuId: boId,
    });
  }

  const byBo = await resolveInstrumentSetByBoMaCatalog(supabase, code);
  if (byBo) {
    return cssdQrHubResolvedSchema.parse({
      targetType: "INSTRUMENT_SET",
      code,
      workflowId: byBo.workflowId,
      boDungCuId: byBo.boDungCuId,
    });
  }

  const hasMachineQrColumn = await tableHasColumn(supabase, "cssd_dm_thiet_bi", "ma_qr_thiet_bi");
  type MachineRow = { id: string; ma_thiet_bi: string | null };
  let machineRow: MachineRow | null = null;
  if (hasMachineQrColumn) {
    const machineResult = await supabase
      .from("cssd_dm_thiet_bi")
      .select("id, ma_thiet_bi, ma_qr_thiet_bi")
      .eq("is_active", true)
      .or(`ma_thiet_bi.eq.${code},ma_qr_thiet_bi.eq.${code}`)
      .limit(1)
      .maybeSingle();
    if (machineResult.error) throw new Error(machineResult.error.message);
    machineRow = machineResult.data
      ? { id: String(machineResult.data.id), ma_thiet_bi: machineResult.data.ma_thiet_bi }
      : null;
  } else {
    const machineResult = await supabase
      .from("cssd_dm_thiet_bi")
      .select("id, ma_thiet_bi")
      .eq("is_active", true)
      .eq("ma_thiet_bi", code)
      .limit(1)
      .maybeSingle();
    if (machineResult.error) throw new Error(machineResult.error.message);
    machineRow = machineResult.data
      ? { id: String(machineResult.data.id), ma_thiet_bi: machineResult.data.ma_thiet_bi }
      : null;
  }
  if (machineRow?.id) {
    return cssdQrHubResolvedSchema.parse({
      targetType: "MACHINE",
      code,
      machineId: machineRow.id,
      machineCode: String(machineRow.ma_thiet_bi || ""),
    });
  }

  return cssdQrHubResolvedSchema.parse({
    targetType: preClassified,
    code,
  });
}
