"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  evaluateHeatCompatibility,
  type BomItem,
} from "@/lib/domain/cssd-packaging-rules";
import {
  packConfirmBlockedByHeatSplit,
  resolveHeatSplitStatus,
  type HeatSplitStatus,
} from "@/lib/domain/cssd-heat-split-status";
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
  soLuongKhoDuPhong: number;
  /** Thiếu cấu phần và kho dự phòng không đủ để bù. */
  reserveShortage: boolean;
};

export type CompositionReconcilePayload = {
  boDungCuId: string;
  maBo: string;
  tenBo: string;
  items: CompositionReconcileRow[];
  heat: ReturnType<typeof evaluateHeatCompatibility>;
  heatSplit: HeatSplitStatus;
  packBlockedReason: string | null;
  hasGap: boolean;
  /** Cảnh báo bù MDM (D-17). */
  replenishWarnings: string[];
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
export async function loadBoCompositionReconcile(boDungCuId: string, quyTrinhId?: string | null) {
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

  const loaiIds = [
    ...new Set(list.map((r) => String((r as { loai_dung_cu_id?: string }).loai_dung_cu_id || "").trim()).filter(Boolean)),
  ];
  const reserveByLoai = new Map<string, number>();
  if (loaiIds.length) {
    const { data: loaiRows } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .select("id, so_luong_kho_du_phong")
      .in("id", loaiIds);
    for (const lr of loaiRows || []) {
      reserveByLoai.set(
        String((lr as { id: string }).id),
        Number((lr as { so_luong_kho_du_phong?: number | null }).so_luong_kho_du_phong || 0),
      );
    }
  }

  const items: CompositionReconcileRow[] = list.map((row) => {
    const r = row as Record<string, unknown>;
    const loaiId = String(r.loai_dung_cu_id || "");
    const missingCount = Number(r.missing_count ?? 0) || 0;
    const isMissing = r.is_missing === true;
    const reserve = reserveByLoai.get(loaiId) ?? 0;
    return {
      chiTietId: String(r.chi_tiet_id || ""),
      loaiDungCuId: loaiId,
      tenDungCuLe: String(r.ten_loai_dung_cu || "—"),
      soLuongKeHoach: Number(r.so_luong_tieu_chuan ?? 0) || 0,
      soLuongThucTe: Number(r.so_luong_thuc_te ?? 0) || 0,
      isMissing,
      missingCount,
      isChiuNhiet: r.is_chiu_nhiet !== false,
      phanLoaiSpaulding: normalizeSpaulding(r.phan_loai_spaulding),
      soLuongKhoDuPhong: reserve,
      reserveShortage: isMissing && missingCount > reserve,
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
  let heatSplit: HeatSplitStatus = resolveHeatSplitStatus({
    requireSplit: heat.requireSplit,
    hasActiveSub: false,
  });
  const qtId = String(quyTrinhId || "").trim();
  if (qtId && heat.requireSplit) {
    const { data: qt } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("ma_vai_tro_bo")
      .eq("id", qtId)
      .maybeSingle();
    const { count } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id", { count: "exact", head: true })
      .eq("quy_trinh_cha_id", qtId)
      .eq("ma_vai_tro_bo", "SUB")
      .eq("is_active", true);
    heatSplit = resolveHeatSplitStatus({
      requireSplit: true,
      maVaiTroBo: (qt as { ma_vai_tro_bo?: string | null } | null)?.ma_vai_tro_bo,
      hasActiveSub: (count || 0) > 0,
    });
  }
  const packBlock = packConfirmBlockedByHeatSplit(heatSplit);
  const hasGap = items.some((i) => i.isMissing);
  const replenishWarnings: string[] = [];
  for (const item of items) {
    if (!item.isMissing) continue;
    if (item.reserveShortage) {
      replenishWarnings.push(
        `${item.tenDungCuLe}: thiếu ${item.missingCount}, kho dự phòng chỉ còn ${item.soLuongKhoDuPhong} — cần bổ sung tại Quản trị danh mục dụng cụ.`,
      );
    } else if (item.soLuongKhoDuPhong > 0) {
      replenishWarnings.push(
        `${item.tenDungCuLe}: có thể bù ${Math.min(item.missingCount, item.soLuongKhoDuPhong)} từ kho dự phòng (còn ${item.soLuongKhoDuPhong}).`,
      );
    } else {
      replenishWarnings.push(`${item.tenDungCuLe}: thiếu ${item.missingCount}, kho dự phòng = 0.`);
    }
  }

  return {
    success: true as const,
    data: {
      boDungCuId: boId,
      maBo,
      tenBo,
      items,
      heat,
      heatSplit,
      packBlockedReason: packBlock.blocked ? packBlock.reason || heat.reason : null,
      hasGap,
      replenishWarnings,
    } satisfies CompositionReconcilePayload,
  };
}

