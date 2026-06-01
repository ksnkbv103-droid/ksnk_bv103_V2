"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { revalidatePath } from "next/cache";
import { replenishSetInstrumentCore } from "@/lib/master-data/cssd-set-replenish-core";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import type { BoDungCuChiTietPreviewRow, BoRefByLoai } from "./bo-dung-cu-chi-tiet.types";

/** Danh sách dụng cụ chi tiết thuộc một bộ (`dm_bo_dung_cu_chi_tiet`). Quyền `BO_DC.view`. */
export async function getBoDungCuChiTietPreviewAction(boDungCuId: string) {
  await verifyPermission("BO_DC", "view");
  const bid = String(boDungCuId || "").trim();
  if (!bid) return { success: false as const, error: "Thiếu thiết bị bộ (id)." };

  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase
    .from("v_cssd_bo_dung_cu_chi_tiet_full")
    .select(
      "id, bo_dung_cu_id, ma_chi_tiet, ten_chi_tiet, ten_dung_cu_le, loai_dung_cu_id, so_luong, ghi_chu, is_active, co_ma_khac, ma_khac, specs, ma_loai_dung_cu, ten_loai_dung_cu",
    )
    .eq("bo_dung_cu_id", bid)
    .order("is_active", { ascending: false })
    .order("ma_chi_tiet", { ascending: true });
  if (error) return { success: false as const, error: error.message };

  const rows = (data || []) as any[];
  const enriched: BoDungCuChiTietPreviewRow[] = rows.map((r) => {
    const specs = r.specs || {};
    const max_suds_count = specs.max_suds_count !== undefined && specs.max_suds_count !== null ? Number(specs.max_suds_count) : null;
    const trong_luong = specs.trong_luong !== undefined ? specs.trong_luong : null;
    return {
      id: r.id,
      ma_chi_tiet: r.ma_chi_tiet,
      ten_chi_tiet: r.ten_chi_tiet,
      ten_dung_cu_le: r.ten_dung_cu_le,
      bo_dung_cu_id: r.bo_dung_cu_id,
      loai_dung_cu_id: r.loai_dung_cu_id,
      so_luong: r.so_luong,
      max_suds_count,
      trong_luong,
      ghi_chu: r.ghi_chu,
      is_active: r.is_active,
      loai_dung_cu: r.loai_dung_cu_id
        ? {
            ma_danh_muc: r.ma_loai_dung_cu || null,
            ten_danh_muc: r.ten_loai_dung_cu || null,
          }
        : null,
    };
  });

  return { success: true as const, data: enriched };
}

/** Tìm các bộ khác cũng đang dùng cùng `loai_dung_cu_id` của chi tiết đã chọn. */
export async function getBoRefsByLoaiAction(loaiDungCuId: string, excludeBoId?: string | null) {
  await verifyPermission("BO_DC", "view");
  const loaiId = String(loaiDungCuId || "").trim();
  if (!loaiId) return { success: true as const, data: [] as BoRefByLoai[] };
  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase
    .from("dm_bo_dung_cu_chi_tiet")
    .select("bo_dung_cu_id")
    .eq("loai_dung_cu_id", loaiId)
    .eq("is_active", true);
  if (error) return { success: false as const, error: error.message };
  const ex = String(excludeBoId || "").trim();
  const boIds = [
    ...new Set(
      (data || [])
        .map((x) => String((x as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || "").trim())
        .filter((id) => Boolean(id) && id !== ex),
    ),
  ];
  if (!boIds.length) return { success: true as const, data: [] as BoRefByLoai[] };
  const { data: bos, error: be } = await supabase
    .from("dm_bo_dung_cu")
    .select("id, ma_bo, ten_bo")
    .in("id", boIds)
    .order("ma_bo", { ascending: true });
  if (be) return { success: false as const, error: be.message };
  return { success: true as const, data: (bos || []) as BoRefByLoai[] };
}

import { appendChiTietIssueNoteAction as appendChiTietIssueNoteActionImpl } from "@/lib/master-data/append-chi-tiet-issue-note.action";

export async function appendChiTietIssueNoteAction(params: {
  chiTietId: string;
  issueType: "HONG" | "MAT";
  note?: string;
}) {
  return appendChiTietIssueNoteActionImpl(params);
}

export async function reportIndividualInstrumentIssueAction(params: {
  loaiDungCuId: string;
  boDungCuId?: string | null;
  quyTrinhId?: string | null;
  issueType: "HONG" | "MAT";
  quantity: number;
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  const supabase = await createServerSupabaseUserClient();
  const loaiId = String(params.loaiDungCuId || "").trim();
  if (!loaiId) return { success: false as const, error: "Thiếu id loại dụng cụ." };
  const quantity = Number(params.quantity || 1);
  if (quantity <= 0) return { success: false as const, error: "Số lượng sự cố phải lớn hơn 0." };

  const { error } = await supabase.from("fact_kho_dung_cu_giao_dich").insert({
    loai_dung_cu_id: loaiId,
    bo_dung_cu_id: params.boDungCuId || null,
    quy_trinh_id: params.quyTrinhId || null,
    loai_giao_dich: params.issueType === "HONG" ? "BAO_HONG" : "BAO_MAT",
    so_luong_thay_doi: -quantity,
    ghi_chu: String(params.note || "").trim() || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { success: false as const, error: error.message };

  revalidatePath(quanTriDungCuHref("bo"));
  revalidatePath(quanTriDungCuHref("chi-tiet"));
  revalidatePath(quanTriDungCuHref());
  return { success: true as const };
}

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

  revalidatePath(quanTriDungCuHref("bo"));
  revalidatePath(quanTriDungCuHref("chi-tiet"));
  revalidatePath(quanTriDungCuHref());
  return { success: true as const };
}
