"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { fetchBatchesAndMachines } from "../helpers/me-tiet-khuan-list-data";
import { assertThietBiSanSangChoMeTietKhuan } from "../helpers/assert-thiet-bi-cho-me-tiet-khuan";
import { getBatchAddRejectionReason, logQuyTrinhVaoMeTietKhuan } from "../helpers/me-tiet-khuan-batch-trace";
import { persistMeTietKhuanFinishWithClient, type PersistMeTietKhuanInput } from "../helpers/persist-me-tiet-khuan";
import { getErrorMessage, mapFkError, safeRevalidate } from "./cssd-action-common";
import { 
  createSterilizationBatchSchema, 
  addQuyTrinhToBatchSchema, 
  finishSterilizationBatchSchema 
} from "@/lib/validations/cssd-erp.validations";

export async function fetchCssdMeListData() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "view");
    const { batches, machines, batchError, machineError } = await fetchBatchesAndMachines(supabase);
    return { success: true as const, batches, machines, batchError, machineError };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: getErrorMessage(e),
      batches: [] as unknown[],
      machines: [] as unknown[],
    };
  }
}

export async function fetchCssdBatchMembers(batchId: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "view");
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ.", data: [] as unknown[] };
    const { data: rows, error } = await supabase
      .from("fact_quy_trinh")
      .select("*")
      .eq("lo_tiet_khuan_id", id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });
    if (error) return { success: false as const, error: mapFkError(error.message), data: [] as unknown[] };
    const raw = (rows || []) as Array<{ bo_dung_cu_id?: string | null } & Record<string, unknown>>;
    const boIds = [...new Set(raw.map((x) => String(x.bo_dung_cu_id || "").trim()).filter(Boolean))];
    let boMap = new Map<string, { ten_bo?: string | null }>();
    if (boIds.length) {
      const { data: bos } = await supabase.from("dm_bo_dung_cu").select("id, ten_bo").in("id", boIds);
      boMap = new Map((bos || []).map((x: { id: string; ten_bo?: string | null }) => [String(x.id), x]));
    }
    const data = raw.map((x) => ({
      ...x,
      ma_vach_qr: x.ma_qr_quy_trinh || "",
      trang_thai_hien_tai: x.ma_trang_thai_hien_tai || "",
      bo: x.bo_dung_cu_id ? { ten_bo: boMap.get(String(x.bo_dung_cu_id))?.ten_bo || null } : null,
    }));
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] as unknown[] };
  }
}

export async function createCssdSterilizationBatch(machineId: string, nguoiLoad: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "edit");
    const validated = createSterilizationBatchSchema.parse({ machineId, nguoiLoad });
    const mid = validated.machineId;
    const nguoi = validated.nguoiLoad;
    const mayOk = await assertThietBiSanSangChoMeTietKhuan(supabase, mid);
    if (!mayOk.ok) return { success: false as const, error: mayOk.message };
    const ma = `LOT-${Date.now().toString().slice(-6)}`;
    const { data: me, error } = await supabase
      .from("fact_lo_tiet_khuan")
      .insert({
        ma_lo_tiet_khuan: ma,
        thiet_bi_id: mid,
        ghi_chu: `Người load: ${nguoi}`,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { success: false as const, error: mapFkError(error.message) };
    safeRevalidate("/cssd-erp/batch");
    return { success: true as const, data: me };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function addQuyTrinhToSterilizationBatch(activeMeId: string, code: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "edit");
    const validated = addQuyTrinhToBatchSchema.parse({ activeMeId, code });
    const meId = validated.activeMeId;
    const qr = validated.code.toUpperCase();

    const { data: me, error: meErr } = await supabase
      .from("fact_lo_tiet_khuan")
      .select("id, ma_lo_tiet_khuan, thiet_bi_id")
      .eq("id", meId)
      .maybeSingle();
    if (meErr) return { success: false as const, error: mapFkError(meErr.message) };
    if (!me) return { success: false as const, error: "Không tìm thấy mẻ." };
    const machineId = String((me as { thiet_bi_id?: string | null }).thiet_bi_id || "").trim();
    if (machineId) {
      const mayOk = await assertThietBiSanSangChoMeTietKhuan(supabase, machineId);
      if (!mayOk.ok) return { success: false as const, error: mayOk.message };
    }

    const { data: qt, error: qtErr } = await supabase
      .from("fact_quy_trinh")
      .select("*")
      .eq("ma_qr_quy_trinh", qr)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qtErr) return { success: false as const, error: mapFkError(qtErr.message) };
    if (!qt) return { success: false as const, error: "Mã QR không hợp lệ hoặc không tồn tại." };

    const qtNormalized = {
      ...qt,
      ma_vach_qr: (qt as { ma_qr_quy_trinh?: string }).ma_qr_quy_trinh,
      trang_thai_hien_tai: (qt as { ma_trang_thai_hien_tai?: string }).ma_trang_thai_hien_tai,
    };
    const reject = getBatchAddRejectionReason(qtNormalized, meId);
    if (reject) return { success: false as const, error: reject };

    const fromDongGoi = String((qtNormalized as { trang_thai_hien_tai?: string }).trang_thai_hien_tai || "").trim() === "DONG_GOI";
    const { error: upErr } = await supabase
      .from("fact_quy_trinh")
      .update({
        lo_tiet_khuan_id: meId,
        updated_at: new Date().toISOString(),
        ...(fromDongGoi ? { ma_trang_thai_hien_tai: "TIET_KHUAN" as const } : {}),
      })
      .eq("id", qt.id);
    if (upErr) return { success: false as const, error: mapFkError(upErr.message) };

    const logMsg = await logQuyTrinhVaoMeTietKhuan(supabase, {
      quyTrinhId: qt.id,
      maVachQr: String(qtNormalized.ma_vach_qr || qr),
      maLo: String(me.ma_lo_tiet_khuan || ""),
      nguoiThucHien: "CSSD",
    });
    const tenBo = String((qt as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || "").trim()
      ? (
          await supabase
            .from("dm_bo_dung_cu")
            .select("ten_bo")
            .eq("id", String((qt as { bo_dung_cu_id?: string | null }).bo_dung_cu_id))
            .maybeSingle()
        ).data?.ten_bo || ""
      : "";
    safeRevalidate("/cssd-erp/batch");
    return {
      success: true as const,
      tenBo: String(tenBo || "").trim() || qr,
      logWarning: logMsg,
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function finishCssdSterilizationBatch(input: PersistMeTietKhuanInput) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "edit");
    const validated = finishSterilizationBatchSchema.parse(input);
    const saved = await persistMeTietKhuanFinishWithClient(supabase, validated as PersistMeTietKhuanInput);
    if (!saved.ok) return { success: false as const, error: saved.message };
    safeRevalidate("/cssd-erp/batch");
    safeRevalidate("/cssd-erp");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
