"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requestReplenishFromReserveAction as requestReplenishFromReserveFacade } from "@/lib/master-data/cssd-instrument-ops.actions";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import {
  evaluateHeatCompatibility,
  summarizeBomGap,
  type BomItem,
} from "@/lib/domain/cssd-packaging-rules";
import { insertCssdLifecycleEvent } from "../shared/application/cssd-lifecycle-events";

/**
 * Tải danh sách cấu phần của quy trình, tích hợp đầy đủ thông tin chịu nhiệt và Spaulding.
 */
export async function loadBomCheckpoint(quyTrinhId: string) {
  await verifyPermission("CSSD_WORKFLOW", "view");
  const supabase = createAdminSupabaseClient();

  const id = String(quyTrinhId || "").trim();
  if (!id) throw new Error("Thiếu quy_trinh_id.");

  const { data, error } = await supabase
    .from("cssd_fact_quy_trinh_thanh_phan")
    .select(`
      id,
      quy_trinh_id,
      dm_bo_dung_cu_chi_tiet_id,
      ten_dung_cu_le,
      so_luong_ke_hoach,
      so_luong_thuc_te,
      cssd_dm_bo_dung_cu_chi_tiet (
        loai_dung_cu_id,
        cssd_dm_loai_dung_cu (
          id,
          is_chiu_nhiet,
          phan_loai_spaulding,
          phuong_phap_tiet_khuan_chi_dinh
        )
      )
    `)
    .eq("quy_trinh_id", id)
    .eq("is_active", true);

  if (error) throw new Error("Không thể tải cấu phần: " + error.message);

  const itemsMapped = (data || []).map((row: any) => {
    const specData = row.cssd_dm_bo_dung_cu_chi_tiet?.cssd_dm_loai_dung_cu;
    
    return {
      id: row.id,
      loai_id: specData?.id || "",
      ten: row.ten_dung_cu_le,
      so_luong_ke_hoach: row.so_luong_ke_hoach,
      so_luong_thuc_te: row.so_luong_thuc_te,
      is_chiu_nhiet: specData?.is_chiu_nhiet !== false, // default true
      phan_loai_spaulding: specData?.phan_loai_spaulding || "CRITICAL",
      phuong_phap_tiet_khuan_chi_dinh: specData?.phuong_phap_tiet_khuan_chi_dinh || "STEAM_134",
    };
  });

  const domainItems: BomItem[] = itemsMapped.map(item => ({
    loai_id: item.loai_id,
    ten: item.ten,
    so_luong_ke_hoach: item.so_luong_ke_hoach,
    so_luong_thuc_te: item.so_luong_thuc_te,
    is_chiu_nhiet: item.is_chiu_nhiet,
    phan_loai_spaulding: item.phan_loai_spaulding,
    phuong_phap_tiet_khuan_chi_dinh: item.phuong_phap_tiet_khuan_chi_dinh,
  }));

  const heat = evaluateHeatCompatibility(domainItems);
  const gap = summarizeBomGap(domainItems);

  return {
    success: true as const,
    data: itemsMapped,
    heat,
    gap,
  };
}

/**
 * Ghi nhận checkpoint kiểm đếm đóng gói an toàn (BOM).
 */
export async function persistBomCheckpoint(input: {
  quy_trinh_id: string;
  lines: Array<{ thanh_phan_id: string; so_luong_thuc_te: number }>;
  do_split: 'NONE' | 'REQUESTED';
  ghi_chu?: string;
}) {
  await verifyPermission("CSSD_WORKFLOW", "edit");
  const supabase = createAdminSupabaseClient();

  // Load existing items first to map domain properties
  const loadResult = await loadBomCheckpoint(input.quy_trinh_id);
  if (!loadResult.success) throw new Error("Lỗi tải danh mục cấu phần.");

  const { data: operatorData } = await supabase.auth.getUser();
  const operatorId = operatorData.user?.id || null;

  // Thực thi RPC atomic duy nhất ở Database
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('rpc_cssd_persist_bom_checkpoint', {
    p_quy_trinh_id: input.quy_trinh_id,
    p_lines: input.lines,
    p_deltas: [], // Các deltas đã được ghi nhận trực tiếp theo thời gian thực
    p_do_split: input.do_split,
    p_operator_id: operatorId
  });

  if (rpcErr || !rpcRes?.success) {
    throw new Error(rpcErr?.message || rpcRes?.message || "Lỗi lưu checkpoint Đóng gói.");
  }

  const { data: qtRow } = await supabase
    .from("v_cssd_quy_trinh_full")
    .select("ma_cycle_qr, ten_bo")
    .eq("id", input.quy_trinh_id)
    .maybeSingle();

  const maCycleQr = String(
    (rpcRes as { ma_cycle_qr?: string | null })?.ma_cycle_qr ||
      (qtRow as { ma_cycle_qr?: string | null } | null)?.ma_cycle_qr ||
      "",
  ).trim();

  // Revalidate các view
  revalidatePath("/cssd-quy-trinh");

  // Kiểm tra cảnh báo lẫn nhiệt để ghi sự kiện cảnh báo
  const domainItems: BomItem[] = loadResult.data.map((item: any) => {
    const lineInput = input.lines.find(l => l.thanh_phan_id === item.id);
    
    return {
      loai_id: item.loai_id,
      ten: item.ten,
      so_luong_ke_hoach: item.so_luong_ke_hoach,
      so_luong_thuc_te: lineInput ? lineInput.so_luong_thuc_te : item.so_luong_thuc_te,
      is_chiu_nhiet: item.is_chiu_nhiet,
      phan_loai_spaulding: item.phan_loai_spaulding,
      phuong_phap_tiet_khuan_chi_dinh: item.phuong_phap_tiet_khuan_chi_dinh,
    };
  });

  const heat = evaluateHeatCompatibility(domainItems);
  const gap = summarizeBomGap(domainItems);

  if (heat.requireSplit && input.do_split === 'NONE') {
    await insertCssdLifecycleEvent(supabase, {
      quy_trinh_id: input.quy_trinh_id,
      ma_su_kien: "BO_LAN_NHIET_CHO_TACH",
      ma_tram: "DONG_GOI",
      ghi_chu: heat.reason,
      payload: { recommendedMethod: heat.recommendedMethod, reason: heat.reason }
    });
  }

  return {
    success: true as const,
    ma_cycle_qr: maCycleQr || null,
    ten_bo: (qtRow as { ten_bo?: string | null } | null)?.ten_bo ?? null,
    heat,
    gap,
  };
}

/**
 * CSSD BOM checkpoint: gọi facade `@/lib/master-data/cssd-instrument-ops` rồi ghi lifecycle audit.
 */
export async function requestReplenishFromReserveAction(params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity?: number;
  note?: string;
}) {
  const result = await requestReplenishFromReserveFacade(params);
  if (!result.success) return result;

  if (params.quyTrinhId) {
    const supabase = createAdminSupabaseClient();
    await insertCssdLifecycleEvent(supabase, {
      quy_trinh_id: params.quyTrinhId,
      ma_su_kien: "BO_SUNG_KHO_LE",
      ma_tram: "DONG_GOI",
      ghi_chu: `Bù dụng cụ lẻ từ kho dự phòng: ${params.note || ""}`.trim(),
      payload: { loai_dung_cu_id: params.loaiDungCuId, quantity: params.quantity ?? 1 },
    });
  }

  return { success: true as const };
}

/**
 * Phân giải mã QR sang Quy trình và Bộ dụng cụ đang hoạt động.
 */
export async function resolveQuyTrinhForCheckpoint(maQR: string) {
  await verifyPermission("CSSD_WORKFLOW", "view");
  const supabase = createAdminSupabaseClient();
  const code = String(maQR || "").trim().toUpperCase();

  const resolved = await resolveCssdCodeWithClient(supabase, code);
  const qt = await fetchActiveQuyTrinhByScanCode(supabase, resolved.code);
  if (!qt?.id) throw new Error(`Không tìm thấy quy trình đang hoạt động cho mã ${resolved.code}.`);

  return {
    success: true as const,
    quyTrinhId: String(qt.id),
    boDungCuId: (qt as { bo_dung_cu_id?: string | null }).bo_dung_cu_id,
    maTrangThaiHien_tai: (qt as { ma_trang_thai_hien_tai?: string | null }).ma_trang_thai_hien_tai,
  };
}

