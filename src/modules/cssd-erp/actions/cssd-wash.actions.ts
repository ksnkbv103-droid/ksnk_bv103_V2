"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyCssdWorkflowEdit, verifyCssdWorkflowView } from "@/lib/cssd-server-gates";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import { validateStationAdvance } from "../workflow/domain/cssd-state-engine";
import { isRejectedLegacyHexBoQr } from "@/lib/domain/cssd-bo-ma";
import { isWasherLoaiMay } from "@/lib/domain/cssd-sterilizer-kind";
import { fefoSortLots, isLotExpired, pickFefoLotKey } from "@/lib/domain/cssd-kho-hoa-chat-fefo";
import { validateWashInput, type CssdWashKetQua, type CssdWashRecord } from "@/lib/domain/cssd-wash-gate";
import { mergeQuyTrinhMetadata } from "../shared/application/cssd-quy-trinh-exceptions";
import { getErrorMessage, mapFkError, revalidateCssdChemicalSurfaces, revalidateCssdWorkflowSurfaces, tableHasColumn } from "./cssd-action-common";
import { normalizeHanIso, normalizeMaLo } from "../helpers/kho-hoa-chat-lot";
import type { Station } from "../types/cssd.types";

export type WashMachineOption = {
  id: string;
  ten: string;
  ma_loai_may: string;
  ten_loai_may: string;
};

export type WashLotOption = {
  dm_hoa_chat_id: string;
  ten_hoa_chat: string;
  ma_lo: string;
  han_su_dung: string | null;
  ton_so_luong: number;
  is_fefo: boolean;
};

export async function prepareLamSachWashGateScan(maQR: string) {
  await verifyCssdWorkflowEdit();
  const supabase = createAdminSupabaseClient();
  const resolved = await resolveCssdCodeWithClient(supabase, maQR);
  if (isRejectedLegacyHexBoQr(resolved.code)) {
    throw new Error(`Mã ${resolved.code} là tem hex cũ — in lại tem mã bộ từ danh mục CSSD.`);
  }
  if (resolved.targetType === "MACHINE") {
    throw new Error("Mã vừa quét là mã máy — dùng Bảo trì thiết bị.");
  }
  if (resolved.targetType === "STERILIZATION_BATCH") {
    throw new Error("Mã mẻ tiệt khuẩn — không quét tại trạm Làm sạch.");
  }
  const qt = await fetchActiveQuyTrinhByScanCode(supabase, resolved.code);
  if (!qt?.id) throw new Error(`Không tìm thấy quy trình đang hoạt động cho mã ${resolved.code}.`);
  const currentStatus = String(qt.ma_trang_thai_hien_tai || "").trim() as Station | "";
  const advance = validateStationAdvance({ currentStatus, targetStation: "LAM_SACH" });
  if (!advance.ok) throw new Error(advance.message);
  if (qt.is_dong_bang === true) throw new Error("Bộ đang khóa an toàn — không làm sạch.");
  return {
    success: true as const,
    code: resolved.code,
    quyTrinhId: String(qt.id),
    boDungCuId: String(qt.bo_dung_cu_id || ""),
    tenBoDungCu: String(qt.ten_bo || resolved.code),
  };
}

export async function listWashStationOptionsAction(): Promise<
  { success: true; machines: WashMachineOption[]; lots: WashLotOption[] } | { success: false; error: string }
> {
  try {
    await verifyCssdWorkflowView();
    const supabase = createAdminSupabaseClient();
    const [{ data: machinesRaw, error: mErr }, { data: tonRaw, error: tErr }] = await Promise.all([
      supabase
        .from("cssd_dm_thiet_bi")
        .select("id, ten_thiet_bi, trang_thai, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may)")
        .eq("is_active", true)
        .in("trang_thai", ["READY", "HOAT_DONG"]),
      supabase.from("v_cssd_kho_hoa_chat_ton_lo").select("dm_hoa_chat_id, ma_lo, han_su_dung, ton_so_luong"),
    ]);
    if (mErr) return { success: false, error: mapFkError(mErr.message) };
    if (tErr) return { success: false, error: mapFkError(tErr.message) };

    const machines: WashMachineOption[] = [];
    for (const row of machinesRaw || []) {
      const lm = (row as { loai_may?: { ma_loai_may?: string; ten_loai_may?: string } | { ma_loai_may?: string; ten_loai_may?: string }[] }).loai_may;
      const lmRow = Array.isArray(lm) ? lm[0] : lm;
      const ma = String(lmRow?.ma_loai_may || "").trim();
      if (!isWasherLoaiMay(ma)) continue;
      machines.push({
        id: String((row as { id: string }).id),
        ten: String((row as { ten_thiet_bi?: string }).ten_thiet_bi || "Máy rửa"),
        ma_loai_may: ma,
        ten_loai_may: String(lmRow?.ten_loai_may || ma),
      });
    }

    const tonRows = (tonRaw || []) as Array<{
      dm_hoa_chat_id?: string;
      ma_lo?: string | null;
      han_su_dung?: string | null;
      ton_so_luong?: number;
    }>;
    const dmIds = [...new Set(tonRows.map((r) => String(r.dm_hoa_chat_id || "")).filter(Boolean))];
    let dmMap = new Map<string, string>();
    if (dmIds.length) {
      const { data: dms } = await supabase.from("cssd_dm_hoa_chat").select("id, ten_hoa_chat").in("id", dmIds);
      dmMap = new Map((dms || []).map((d: { id: string; ten_hoa_chat?: string }) => [String(d.id), String(d.ten_hoa_chat || "")]));
    }
    const lotsUnsorted: WashLotOption[] = tonRows
      .filter((r) => Number(r.ton_so_luong || 0) > 0)
      .map((r) => ({
        dm_hoa_chat_id: String(r.dm_hoa_chat_id || ""),
        ten_hoa_chat: dmMap.get(String(r.dm_hoa_chat_id || "")) || "Hóa chất",
        ma_lo: String(r.ma_lo || "").trim(),
        han_su_dung: r.han_su_dung ? String(r.han_su_dung).slice(0, 10) : null,
        ton_so_luong: Number(r.ton_so_luong || 0),
        is_fefo: false,
      }))
      .filter((r) => r.dm_hoa_chat_id && r.ma_lo && !isLotExpired(r.han_su_dung));
    const sorted = fefoSortLots(lotsUnsorted);
    const fefoKey = pickFefoLotKey(sorted);
    const lots = sorted.map((l) => ({ ...l, is_fefo: `${l.ma_lo}|${l.han_su_dung ?? ""}` === fefoKey }));
    return { success: true, machines, lots };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export async function persistLamSachWashAction(input: {
  quyTrinhId: string;
  thiet_bi_id: string;
  dm_hoa_chat_id: string;
  ma_lo: string;
  han_su_dung?: string | null;
  ket_qua: CssdWashKetQua;
  issueStock?: boolean;
}): Promise<{ success: true; issued: boolean } | { success: false; error: string }> {
  try {
    await verifyCssdWorkflowEdit();
    const supabase = createAdminSupabaseClient();
    const qtId = String(input.quyTrinhId || "").trim();
    if (!qtId) return { success: false, error: "Thiếu quy trình." };

    const { data: tb, error: tbErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .select("id, ten_thiet_bi, trang_thai, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may)")
      .eq("id", String(input.thiet_bi_id || "").trim())
      .maybeSingle();
    if (tbErr) return { success: false, error: mapFkError(tbErr.message) };
    const lm = (tb as { loai_may?: { ma_loai_may?: string } | { ma_loai_may?: string }[] } | null)?.loai_may;
    const lmRow = Array.isArray(lm) ? lm[0] : lm;
    const maLoai = String(lmRow?.ma_loai_may || "").trim();
    const st = String((tb as { trang_thai?: string } | null)?.trang_thai || "");
    const ready = st === "READY" || st === "HOAT_DONG";
    const han = normalizeHanIso(input.han_su_dung);
    const maLo = normalizeMaLo(input.ma_lo) || "";
    const inputErr = validateWashInput({
      thiet_bi_id: String(input.thiet_bi_id || ""),
      ma_loai_may: maLoai,
      machine_ready: ready,
      is_washer: isWasherLoaiMay(maLoai),
      dm_hoa_chat_id: input.dm_hoa_chat_id,
      ma_lo: maLo,
      han_su_dung: han,
      lot_expired: isLotExpired(han),
      ket_qua: input.ket_qua,
    });
    if (inputErr) return { success: false, error: inputErr };

    let tenHc = "";
    const { data: hc } = await supabase
      .from("cssd_dm_hoa_chat")
      .select("ten_hoa_chat")
      .eq("id", String(input.dm_hoa_chat_id).trim())
      .maybeSingle();
    tenHc = String((hc as { ten_hoa_chat?: string } | null)?.ten_hoa_chat || "");

    let operator = "CSSD";
    try {
      const uc = await createServerSupabaseUserClient();
      const { data } = await uc.auth.getUser();
      operator = data.user?.email?.trim() || operator;
    } catch {
      /* demo */
    }

    const wash: CssdWashRecord = {
      ket_qua: input.ket_qua,
      thiet_bi_id: String(input.thiet_bi_id),
      ten_thiet_bi: String((tb as { ten_thiet_bi?: string } | null)?.ten_thiet_bi || ""),
      ma_loai_may: maLoai,
      dm_hoa_chat_id: String(input.dm_hoa_chat_id),
      ten_hoa_chat: tenHc,
      ma_lo: maLo,
      han_su_dung: han,
      so_luong_xuat: input.issueStock === false || input.ket_qua !== "DAT" ? 0 : 1,
      recorded_at: new Date().toISOString(),
      operator,
    };
    const merged = await mergeQuyTrinhMetadata(supabase, qtId, { wash });
    if (!merged.ok) return { success: false, error: merged.message };

    let issued = false;
    if (input.ket_qua === "DAT" && input.issueStock !== false) {
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        ma_phieu: `XK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        dm_hoa_chat_id: wash.dm_hoa_chat_id,
        loai_giao_dich: "XUAT",
        so_luong_co_dau: -1,
        ma_lo: maLo,
        han_su_dung: han,
        ghi_chu: `Rửa bộ quy_trinh=${qtId} máy=${wash.ten_thiet_bi || wash.thiet_bi_id}`,
        updated_at: now,
      };
      if (await tableHasColumn(supabase, "cssd_fact_kho_hoa_chat_giao_dich", "quy_trinh_id")) {
        row.quy_trinh_id = qtId;
      }
      const { error: xErr } = await supabase.from("cssd_fact_kho_hoa_chat_giao_dich").insert(row);
      if (xErr) {
        return { success: false, error: `Đã ghi nhật ký rửa nhưng không xuất kho hóa chất: ${mapFkError(xErr.message)}` };
      }
      issued = true;
      revalidateCssdChemicalSurfaces();
    }

    revalidateCssdWorkflowSurfaces();
    return { success: true, issued };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
