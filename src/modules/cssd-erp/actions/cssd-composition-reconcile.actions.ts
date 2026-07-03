"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  evaluateHeatCompatibility,
  type BomItem,
} from "@/lib/domain/cssd-packaging-rules";
import {
  normalizeSpaulding,
  normalizeSteamMethod,
} from "../shared/domain/cssd-quy-trinh-bom";

export type CompositionReconcileRow = {
  chiTietId: string;
  loaiDungCuId: string;
  tenDungCuLe: string;
  soLuongKeHoach: number;
  soLuongThucTe: number;
  isMissing: boolean;
  missingCount: number;
  isChiuNhiet: boolean;
  phanLoaiSpaulding: string;
};

export type CompositionReconcilePayload = {
  boDungCuId: string;
  maBo: string;
  tenBo: string;
  items: CompositionReconcileRow[];
  heat: ReturnType<typeof evaluateHeatCompatibility>;
  hasGap: boolean;
};

/** Tải đối chiếu cấu phần theo mã QR bộ (tem). */
export async function loadBoCompositionByMaBo(maBo: string) {
  await verifyPermission("CSSD_WORKFLOW", "view");
  const supabase = createAdminSupabaseClient();
  const code = String(maBo || "").trim().toUpperCase();
  if (!code) throw new Error("Thiếu mã QR bộ dụng cụ.");

  const { data: bo, error: boErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id")
    .eq("ma_bo", code)
    .eq("is_active", true)
    .maybeSingle();
  if (boErr) throw new Error(boErr.message);
  const boId = String((bo as { id?: string } | null)?.id || "").trim();
  if (!boId) throw new Error("Không tìm thấy bộ dụng cụ theo mã QR.");

  return loadBoCompositionReconcile(boId);
}

/** Tải danh sách đối chiếu cấu phần bộ từ view realtime (KH vs TT). */
export async function loadBoCompositionReconcile(boDungCuId: string) {
  await verifyPermission("CSSD_WORKFLOW", "view");
  const supabase = createAdminSupabaseClient();
  const boId = String(boDungCuId || "").trim();
  if (!boId) throw new Error("Thiếu mã bộ dụng cụ.");

  const { data: rows, error } = await supabase
    .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
    .select(
      "chi_tiet_id, bo_dung_cu_id, ma_bo, ten_bo, loai_dung_cu_id, ten_loai_dung_cu, so_luong_tieu_chuan, so_luong_thuc_te, is_missing, missing_count, is_chiu_nhiet, phan_loai_spaulding, phuong_phap_tiet_khuan",
    )
    .eq("bo_dung_cu_id", boId)
    .eq("is_active", true)
    .order("ten_loai_dung_cu");

  if (error) throw new Error(error.message);

  const list = rows || [];
  const maBo = String((list[0] as { ma_bo?: string } | undefined)?.ma_bo || "").trim();
  const tenBo = String((list[0] as { ten_bo?: string } | undefined)?.ten_bo || "").trim();

  const items: CompositionReconcileRow[] = list.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      chiTietId: String(r.chi_tiet_id || ""),
      loaiDungCuId: String(r.loai_dung_cu_id || ""),
      tenDungCuLe: String(r.ten_loai_dung_cu || "—"),
      soLuongKeHoach: Number(r.so_luong_tieu_chuan ?? 0) || 0,
      soLuongThucTe: Number(r.so_luong_thuc_te ?? 0) || 0,
      isMissing: r.is_missing === true,
      missingCount: Number(r.missing_count ?? 0) || 0,
      isChiuNhiet: r.is_chiu_nhiet !== false,
      phanLoaiSpaulding: normalizeSpaulding(r.phan_loai_spaulding),
    };
  });

  const domainItems: BomItem[] = items.map((item) => ({
    loai_id: item.loaiDungCuId,
    ten: item.tenDungCuLe,
    so_luong_ke_hoach: item.soLuongKeHoach,
    so_luong_thuc_te: item.soLuongThucTe,
    is_chiu_nhiet: item.isChiuNhiet,
    phan_loai_spaulding: normalizeSpaulding(item.phanLoaiSpaulding),
    phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(
      (list.find((x) => String((x as { chi_tiet_id?: string }).chi_tiet_id) === item.chiTietId) as
        | { phuong_phap_tiet_khuan?: string }
        | undefined)?.phuong_phap_tiet_khuan,
    ),
  }));

  const heat = evaluateHeatCompatibility(domainItems);
  const hasGap = items.some((i) => i.isMissing);

  return {
    success: true as const,
    data: {
      boDungCuId: boId,
      maBo,
      tenBo,
      items,
      heat,
      hasGap,
    } satisfies CompositionReconcilePayload,
  };
}

