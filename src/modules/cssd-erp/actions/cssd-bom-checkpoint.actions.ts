"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requestReplenishFromReserveAction as requestReplenishFromReserveFacade } from "@/lib/master-data/cssd-instrument-ops.actions";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import {
  evaluateHeatCompatibility,
  summarizeBomGap,
  type BomItem,
} from "@/lib/domain/cssd-packaging-rules";
import { normalizeSpaulding, normalizeSteamMethod } from "../shared/domain/cssd-quy-trinh-bom";
import { insertCssdLifecycleEvent } from "../shared/application/cssd-lifecycle-events";
import { resolveCssdOperatorNhanSuId } from "../shared/application/cssd-operator-resolve";
import {
  applyBomCheckpointLines,
  loadBomLinesWithLoaiSpec,
} from "../shared/application/cssd-quy-trinh-bom";
import type { Station } from "../types/cssd.types";
import { validateStationAdvance } from "../workflow/domain/cssd-state-engine";
import { isRejectedLegacyHexBoQr } from "@/lib/domain/cssd-bo-ma";

/** Tải danh sách cấu phần BOM runtime (metadata.bom_lines) kèm Spaulding/chịu nhiệt. */
export async function loadBomCheckpoint(quyTrinhId: string) {
  await verifyPermission("CSSD_WORKFLOW", "view");
  const supabase = createAdminSupabaseClient();

  const id = String(quyTrinhId || "").trim();
  if (!id) throw new Error("Thiếu quy_trinh_id.");

  const loaded = await loadBomLinesWithLoaiSpec(supabase, id);
  if (!loaded.ok) throw new Error(loaded.message);

  const itemsMapped = loaded.bomLines.map((row) => ({
    id: row.line_key,
    loai_id: row.loai_id,
    ten: row.ten_dung_cu_le,
    so_luong_ke_hoach: row.so_luong_ke_hoach,
    so_luong_thuc_te: row.so_luong_thuc_te,
    is_chiu_nhiet: row.is_chiu_nhiet,
    phan_loai_spaulding: row.phan_loai_spaulding,
    phuong_phap_tiet_khuan_chi_dinh: row.phuong_phap_tiet_khuan_chi_dinh,
  }));

  const domainItems: BomItem[] = itemsMapped.map((item) => ({
    loai_id: item.loai_id,
    ten: item.ten,
    so_luong_ke_hoach: item.so_luong_ke_hoach,
    so_luong_thuc_te: item.so_luong_thuc_te,
    is_chiu_nhiet: item.is_chiu_nhiet,
    phan_loai_spaulding: normalizeSpaulding(item.phan_loai_spaulding),
    phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(item.phuong_phap_tiet_khuan_chi_dinh),
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

/** Ghi nhận checkpoint kiểm đếm đóng gói an toàn (BOM). */
export async function persistBomCheckpoint(input: {
  quy_trinh_id: string;
  lines: Array<{ line_key: string; so_luong_thuc_te: number }>;
  do_split: "NONE" | "REQUESTED";
  ghi_chu?: string;
}) {
  await verifyPermission("CSSD_WORKFLOW", "edit");
  const supabase = createAdminSupabaseClient();

  const loadResult = await loadBomCheckpoint(input.quy_trinh_id);
  if (!loadResult.success) throw new Error("Lỗi tải danh mục cấu phần.");

  const { data: operatorData } = await (await createServerSupabaseUserClient()).auth.getUser();
  const operatorId = await resolveCssdOperatorNhanSuId(supabase, {
    authUserId: operatorData.user?.id,
    email: operatorData.user?.email,
  });

  const merged = await applyBomCheckpointLines(supabase, input.quy_trinh_id, input.lines);
  if (!merged.ok) throw new Error(merged.message);

  const { data: rpcRes, error: rpcErr } = await supabase.rpc("rpc_cssd_persist_bom_checkpoint", {
    p_quy_trinh_id: input.quy_trinh_id,
    p_bom_lines: merged.bomLines,
    p_deltas: [],
    p_do_split: input.do_split,
    p_operator_id: operatorId,
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

  revalidatePath("/cssd-quy-trinh");

  const domainItems: BomItem[] = loadResult.data.map((item) => {
    const lineInput = input.lines.find((l) => l.line_key === item.id);
    return {
      loai_id: item.loai_id,
      ten: item.ten,
      so_luong_ke_hoach: item.so_luong_ke_hoach,
      so_luong_thuc_te: lineInput ? lineInput.so_luong_thuc_te : item.so_luong_thuc_te,
      is_chiu_nhiet: item.is_chiu_nhiet,
      phan_loai_spaulding: normalizeSpaulding(item.phan_loai_spaulding),
      phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(item.phuong_phap_tiet_khuan_chi_dinh),
    };
  });

  const heat = evaluateHeatCompatibility(domainItems);
  const gap = summarizeBomGap(domainItems);

  if (heat.requireSplit && input.do_split === "NONE") {
    await insertCssdLifecycleEvent(supabase, {
      quy_trinh_id: input.quy_trinh_id,
      ma_su_kien: "BO_LAN_NHIET_CHO_TACH",
      ma_tram: "DONG_GOI",
      ghi_chu: heat.reason,
      payload: { recommendedMethod: heat.recommendedMethod, reason: heat.reason },
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

/** CSSD BOM checkpoint: gọi facade bù kho dự phòng + ghi audit metadata. */
export async function requestReplenishFromReserveAction(params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity?: number;
  note?: string;
}) {
  // Facade đã verify CSSD_WORKFLOW edit trước khi ghi kho.
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

export async function resolveQuyTrinhForCheckpoint(maQR: string) {
  await verifyPermission("CSSD_WORKFLOW", "view");
  const prep = await prepareDongGoiBomGateScan(maQR, { edit: false });
  return {
    success: true as const,
    quyTrinhId: prep.quyTrinhId,
    boDungCuId: prep.boDungCuId,
    maTrangThaiHien_tai: prep.maTrangThaiHienTai,
  };
}

/** Xác thực mã QR trước khi mở Digital BOM tại trạm Đóng gói. */
export async function prepareDongGoiBomGateScan(
  maQR: string,
  opts?: { edit?: boolean },
) {
  if (opts?.edit !== false) {
    await verifyPermission("CSSD_WORKFLOW", "edit");
  } else {
    await verifyPermission("CSSD_WORKFLOW", "view");
  }

  const supabase = createAdminSupabaseClient();
  const resolved = await resolveCssdCodeWithClient(supabase, maQR);
  if (isRejectedLegacyHexBoQr(resolved.code)) {
    throw new Error(
      `Mã ${resolved.code} là tem hex cũ — không còn hỗ trợ. In lại tem mã bộ từ danh mục CSSD.`,
    );
  }
  if (resolved.targetType === "MACHINE") {
    throw new Error("Mã vừa quét là mã máy — dùng màn Bảo trì thiết bị hoặc Mẻ tiệt khuẩn.");
  }
  if (resolved.targetType === "STERILIZATION_BATCH") {
    throw new Error(
      `Mã ${resolved.code} là mã mẻ tiệt khuẩn — dùng tab Truy vết, không quét tại trạm workflow.`,
    );
  }

  const qt = await fetchActiveQuyTrinhByScanCode(supabase, resolved.code);
  if (!qt?.id) {
    throw new Error(`Không tìm thấy quy trình đang hoạt động cho mã ${resolved.code}.`);
  }

  const currentStatus = String(qt.ma_trang_thai_hien_tai || "").trim() as Station | "";
  const tiepNhanPending =
    currentStatus === "TIEP_NHAN" && !String(qt.thoi_gian_tiep_nhan || "").trim();
  const advance = validateStationAdvance({
    currentStatus,
    targetStation: "DONG_GOI",
    tiepNhanPending,
  });
  if (!advance.ok) throw new Error(advance.message);

  if (qt.is_dong_bang === true) {
    throw new Error("Bộ dụng cụ đang bị khóa an toàn — không thể đóng gói.");
  }

  const boDungCuId = String(qt.bo_dung_cu_id || "").trim();
  if (!boDungCuId) {
    throw new Error("Quy trình chưa gán bộ dụng cụ — không thể mở bảng kiểm cấu phần.");
  }

  const bomKiemDemAt = String(qt.bom_kiem_dem_at || "").trim();
  const skipModal = currentStatus === "QC" && bomKiemDemAt.length > 0;

  return {
    success: true as const,
    code: resolved.code,
    quyTrinhId: String(qt.id),
    boDungCuId,
    tenBoDungCu: String(qt.ten_bo || resolved.code),
    maTrangThaiHienTai: currentStatus,
    skipModal,
  };
}
