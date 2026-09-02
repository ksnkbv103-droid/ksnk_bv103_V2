"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import { replenishSetInstrumentCore } from "@/lib/master-data/cssd-set-replenish-core";
import { validateLayKhoQty } from "@/lib/domain/cssd-instrument-incident";
import {
  insertInstrumentIssueLedgerCore,
  type InstrumentIssueType,
} from "@/lib/master-data/instrument-issue-core";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

function revalidateReplenishPaths() {
  revalidatePath(quanTriDungCuHref("bo"));
  revalidatePath(quanTriDungCuHref("chi-tiet"));
  revalidatePath(quanTriDungCuHref());
}

function revalidateIssuePaths() {
  revalidateReplenishPaths();
  revalidatePath(CSSD_ROUTES.dungCu);
  revalidatePath(CSSD_ROUTES.quyTrinh);
}

/** MDM hub — bổ sung dụng cụ vào bộ từ kho dự phòng. Quyền `DC_LE.edit`, user client (RLS). */
export async function replenishSetInstrumentAction(params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity: number;
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  const supabase = await createServerSupabaseUserClient();
  const result = await replenishSetInstrumentCore(supabase, params);
  if (!result.success) return result;

  revalidateReplenishPaths();
  return { success: true as const };
}

/**
 * CSSD workflow facade — bù dụng cụ lẻ từ kho dự phòng.
 * Quyền `CSSD_WORKFLOW.edit` (không cần `DC_LE.edit`); admin client để ghi ledger khi RLS MDM chặn.
 */
export async function requestReplenishFromReserveAction(params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity?: number;
  note?: string;
}) {
  try {
    await verifyPermission("CSSD_WORKFLOW", "edit");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false as const,
      error:
        msg.includes("không có quyền") || msg.includes("chưa đăng nhập")
          ? "Không đủ quyền vận hành CSSD (sửa quy trình) để bù kho lẻ. Liên hệ quản trị cấp quyền «Quy trình luân chuyển QR trạm CSSD» — không cần quyền sửa danh mục dụng cụ."
          : msg,
    };
  }
  const supabase = createAdminSupabaseClient();
  const loaiId = String(params.loaiDungCuId || "").trim();
  const boId = String(params.boDungCuId || "").trim();
  const quantity = Math.max(1, Math.floor(Number(params.quantity ?? 1) || 1));
  if (!loaiId || !boId) {
    return { success: false as const, error: "Thiếu id loại dụng cụ hoặc bộ dụng cụ." };
  }

  const [{ data: ct }, { data: rt }, { data: loai }] = await Promise.all([
    supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("id, so_luong")
      .eq("bo_dung_cu_id", boId)
      .eq("loai_dung_cu_id", loaiId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select("so_luong_thuc_te")
      .eq("bo_dung_cu_id", boId)
      .eq("loai_dung_cu_id", loaiId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase.from("cssd_dm_loai_dung_cu").select("so_luong_kho_du_phong").eq("id", loaiId).maybeSingle(),
  ]);
  const chiTietId = String((ct as { id?: string } | null)?.id || "").trim();
  if (!chiTietId) {
    return {
      success: false as const,
      error: "Lấy kho chỉ trên loại đã có dòng chuẩn trên bộ. Thêm dòng định mức ở Quản trị.",
    };
  }
  const chuan = Math.max(0, Number((ct as { so_luong?: number } | null)?.so_luong ?? 0) || 0);
  const thucTe = Math.max(0, Number((rt as { so_luong_thuc_te?: number } | null)?.so_luong_thuc_te ?? 0) || 0);
  const kho = Math.max(
    0,
    Number((loai as { so_luong_kho_du_phong?: number | null } | null)?.so_luong_kho_du_phong ?? 0) || 0,
  );
  const layErr = validateLayKhoQty(quantity, chuan, thucTe, kho);
  if (layErr) return { success: false as const, error: layErr };

  const result = await replenishSetInstrumentCore(supabase, {
    loaiDungCuId: loaiId,
    boDungCuId: boId,
    quyTrinhId: params.quyTrinhId,
    quantity,
    note: params.note ?? "Lấy từ kho cho đủ chuẩn (facade CSSD workflow)",
  });
  if (!result.success) return result;

  revalidatePath("/cssd-quy-trinh");
  revalidatePath(quanTriDungCuHref());
  return { success: true as const };
}

/** MDM hub — báo hỏng/mất theo loại dụng cụ lẻ. Quyền `DC_LE.edit`. */
export async function reportIndividualInstrumentIssueAction(params: {
  loaiDungCuId: string;
  boDungCuId?: string | null;
  quyTrinhId?: string | null;
  issueType: InstrumentIssueType;
  quantity: number;
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  const supabase = await createServerSupabaseUserClient();
  const result = await insertInstrumentIssueLedgerCore(supabase, {
    loaiDungCuId: params.loaiDungCuId,
    issueType: params.issueType,
    quantity: params.quantity,
    boDungCuId: params.boDungCuId,
    quyTrinhId: params.quyTrinhId,
    note: params.note,
  });
  if (!result.success) return result;

  revalidateIssuePaths();
  return { success: true as const };
}
