"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdBatchView, verifyCssdKhoDungCuView, verifyCssdWorkflowView } from "@/lib/cssd-server-gates";
import { fetchCssdBatchMembers } from "./cssd-batch.actions";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import { getErrorMessage } from "../shared/cssd-db-utils";
import { loadNhanSuHoTen } from "../shared/application/cssd-operator-resolve";
import {
  parseBatchQcJson,
  parseBatchAnhMinhChung,
  parseNguoiLoadFromGhiChu,
} from "../lib/cssd-print-format";
import type {
  CssdBatchPrintData,
  CssdCapPhatPrintData,
  CssdPrintInstrumentRow,
} from "../types/cssd-print.types";

import { parseBomLinesFromMetadata } from "../shared/domain/cssd-quy-trinh-bom";

async function loadInstrumentsForQuyTrinh(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  quyTrinhId: string,
): Promise<CssdPrintInstrumentRow[]> {
  const id = String(quyTrinhId || "").trim();
  if (!id) return [];

  const { data: qt, error: qtErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("bo_dung_cu_id, metadata")
    .eq("id", id)
    .maybeSingle();
  if (qtErr) throw new Error(qtErr.message);

  const fromMeta = parseBomLinesFromMetadata((qt as { metadata?: unknown } | null)?.metadata);
  if (fromMeta.length > 0) {
    return fromMeta.map((row) => ({
      ten: row.ten_dung_cu_le,
      keHoach: row.so_luong_ke_hoach,
      thucTe: row.so_luong_thuc_te,
    }));
  }

  const boId = String((qt as { bo_dung_cu_id?: string | null } | null)?.bo_dung_cu_id || "").trim();
  if (!boId) return [];

  const { data: dmRows, error: dmErr } = await supabase
    .from("v_cssd_bo_dung_cu_chi_tiet_full")
    .select("ten_dung_cu_le, ten_chi_tiet, so_luong")
    .eq("bo_dung_cu_id", boId)
    .eq("is_active", true)
    .order("ten_dung_cu_le");
  if (dmErr) throw new Error(dmErr.message);

  return (dmRows || []).map((row: Record<string, unknown>) => {
    const qty = Number(row.so_luong ?? 1) || 1;
    return {
      ten: String(row.ten_dung_cu_le || row.ten_chi_tiet || "—"),
      keHoach: qty,
      thucTe: qty,
    };
  });
}

async function loadBatchRow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  opts: { batchId?: string; maLo?: string },
) {
  let q = supabase
    .from("cssd_fact_lo_tiet_khuan")
    .select(
      "id, ma_lo_tiet_khuan, ket_qua_test, ghi_chu, ghi_chu_qc, tk_qc_json, thoi_gian_bat_dau, thoi_gian_ket_thuc, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi)",
    )
    .eq("is_active", true);
  if (opts.batchId) q = q.eq("id", opts.batchId);
  else if (opts.maLo) q = q.eq("ma_lo_tiet_khuan", opts.maLo.toUpperCase());
  else return null;
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

function mapBatchPrintData(
  batch: Record<string, unknown>,
  members: Array<Record<string, unknown>>,
): CssdBatchPrintData {
  const qc = parseBatchQcJson(batch.tk_qc_json);
  const thietBi =
    (batch.thiet_bi as { ten_thiet_bi?: string } | null)?.ten_thiet_bi?.trim() || "—";

  const mappedMembers = members.map((m, idx) => ({
    stt: idx + 1,
    maQrBo: String(m.ma_bo || m.ma_vach_qr || m.ma_qr_quy_trinh || "—"),
    tenBo: String((m.bo as { ten_bo?: string } | null)?.ten_bo || m.ten_bo || "—"),
  }));

  return {
    batchId: String(batch.id),
    maLo: String(batch.ma_lo_tiet_khuan || ""),
    ketQuaDat: batch.ket_qua_test === true,
    thietBi,
    nguoiLoad: parseNguoiLoadFromGhiChu(String(batch.ghi_chu || "")),
    nguoiUnload: qc.nguoiUnload || "—",
    nhietDoApSuat: qc.nhietDoApSuat || "—",
    thongSoMay: qc.thongSoMay || "—",
    chiThiTiepXuc: qc.chiThiTiepXuc || "—",
    chiThiDaThongSo: qc.chiThiDaThongSo || "—",
    testSinhHoc: qc.testSinhHoc || "NA",
    testCI: qc.testCI || "—",
    testBowieDick: qc.testBowieDick || "NA",
    thoiGianBatDau: (batch.thoi_gian_bat_dau as string | null) ?? null,
    thoiGianKetThuc: (batch.thoi_gian_ket_thuc as string | null) ?? null,
    ghiChuQc: String(batch.ghi_chu_qc || batch.ghi_chu || ""),
    anhMinhChung: parseBatchAnhMinhChung(batch.tk_qc_json),
    members: mappedMembers,
  };
}

async function buildBatchPrintPayload(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  opts: { batchId?: string; maLo?: string },
): Promise<CssdBatchPrintData> {
  const batch = await loadBatchRow(supabase, opts);
  if (!batch?.id) throw new Error("Không tìm thấy mẻ tiệt khuẩn.");

  const memRes = await fetchCssdBatchMembers(String(batch.id));
  if (!memRes.success) throw new Error(memRes.error || "Không tải thành phần mẻ.");
  const members = (memRes.data || []) as Array<Record<string, unknown>>;

  return mapBatchPrintData(batch, members);
}

export async function fetchCssdBatchPrintData(batchId: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdBatchView();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ." };
    const data = await buildBatchPrintPayload(supabase, { batchId: id });
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function fetchCssdBatchPrintDataByMaLo(maLo: string) {
  try {
    await verifyCssdWorkflowView();
    const code = String(maLo || "").trim().toUpperCase();
    if (!code) return { success: false as const, error: "Thiếu mã lô." };
    const supabase = createAdminSupabaseClient();
    const data = await buildBatchPrintPayload(supabase, { maLo: code });
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

async function loadBatchSummaryForCapPhat(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  loTietKhuanId: string | null | undefined,
) {
  if (!loTietKhuanId) return null;
  return loadBatchRow(supabase, { batchId: String(loTietKhuanId) });
}

export async function fetchCssdCapPhatPrintData(quyTrinhId: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdKhoDungCuView();
    const id = String(quyTrinhId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu quy trình." };

    const { data: qt, error: qtErr } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (qtErr) return { success: false as const, error: qtErr.message };
    if (!qt) return { success: false as const, error: "Không tìm thấy bộ dụng cụ." };

    const row = qt as Record<string, unknown>;
    const loId = String(row.lo_tiet_khuan_id || "").trim() || null;
    const batch = await loadBatchSummaryForCapPhat(supabase, loId);
    if (!batch) {
      return { success: false as const, error: "Bộ chưa gắn mẻ tiệt khuẩn — không in phiếu cấp phát." };
    }
    if (batch.ket_qua_test !== true) {
      return { success: false as const, error: "Mẻ tiệt khuẩn chưa đạt QC — không in phiếu cấp phát." };
    }

    const qc = parseBatchQcJson(batch.tk_qc_json);
    const instruments = await loadInstrumentsForQuyTrinh(supabase, id);
    const maLo = String(batch.ma_lo_tiet_khuan || "");
    const nguoiCapPhat =
      (await loadNhanSuHoTen(supabase, row.nguoi_cap_phat_id as string | null)) ||
      (await loadNhanSuHoTen(supabase, row.nguoi_tiet_khuan_id as string | null)) ||
      "—";
    const thoiGianCapPhat = String(row.thoi_gian_cap_phat || row.thoi_gian_tiet_khuan || "").trim() || null;

    const data: CssdCapPhatPrintData = {
      quyTrinhId: id,
      maLo,
      maCycleQr: String(row.ma_cycle_qr || "").trim() || null,
      maQrBo: String(row.ma_bo || row.ma_qr_quy_trinh || ""),
      tenBo: String(row.ten_bo || "—"),
      hanSuDung: (row.han_su_dung as string | null) ?? null,
      maCaMo: String(row.ma_ca_mo_id || "").trim() || null,
      nguoiCapPhat,
      thoiGianCapPhat: thoiGianCapPhat || new Date().toISOString(),
      thietBi: (batch.thiet_bi as { ten_thiet_bi?: string } | null)?.ten_thiet_bi?.trim() || "—",
      nguoiLoad: parseNguoiLoadFromGhiChu(String(batch.ghi_chu || "")),
      nguoiUnload: qc.nguoiUnload || "—",
      nhietDoApSuat: qc.nhietDoApSuat || "—",
      thongSoMay: qc.thongSoMay || "—",
      chiThiTiepXuc: qc.chiThiTiepXuc || "—",
      chiThiDaThongSo: qc.chiThiDaThongSo || "—",
      testSinhHoc: qc.testSinhHoc || "NA",
      testCI: qc.testCI || "—",
      testBowieDick: qc.testBowieDick || "NA",
      thoiGianKetThucMe: (batch.thoi_gian_ket_thuc as string | null) ?? null,
      instruments,
    };

    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function fetchCssdCapPhatPrintDataByQr(qr: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdKhoDungCuView();
    const qt = await fetchActiveQuyTrinhByScanCode(supabase, qr);
    if (!qt?.id) return { success: false as const, error: "Không tìm thấy bộ theo mã QR." };
    return fetchCssdCapPhatPrintData(String(qt.id));
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Truy vết tab: quét mã lô LOT-* → trả payload phiếu mẻ. */
export async function fetchCssdBatchTraceByMaLo(maLo: string) {
  const res = await fetchCssdBatchPrintDataByMaLo(maLo);
  if (!res.success) return res;
  return {
    success: true as const,
    kind: "BATCH" as const,
    data: res.data,
  };
}
