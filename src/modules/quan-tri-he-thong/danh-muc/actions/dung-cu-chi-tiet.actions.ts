"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { requireCssdCatalogMasterWrite } from "@/lib/master-data/require-cssd-catalog-master-write";
import { isCssdUnifiedBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { planAddOntoExistingQty } from "@/lib/master-data/cssd-bom-line-merge";
import {
  findActiveBomLineByBoLoai,
  mergeDuplicateBomLinesForBo,
} from "@/lib/master-data/cssd-bom-line-merge.application";
import { revalidateMasterDataRowCacheTag } from "@/lib/cache/revalidate-master-data-tags";
import { upsertMasterRow } from "./master-crud-core";

/** Lưu một dòng thành phần bộ — gọi từ panel trong tab Bộ. */
export async function saveDungCuChiTietAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("DC_LE", id ? "edit" : "create");
  await requireCssdCatalogMasterWrite();
  const supabase = createAdminSupabaseClient();
  const ma = String(input.ma_chi_tiet || "").trim().toUpperCase();
  const ten = String(input.ten_chi_tiet || "").trim();
  const boRaw = String(input.bo_dung_cu_id || "").trim();
  const loaiRaw = String(input.loai_dung_cu_id || "").trim();
  const soLuongRaw = Number(input.so_luong);
  const soLuong =
    Number.isFinite(soLuongRaw) && soLuongRaw >= 1 ? Math.floor(soLuongRaw) : 1;
  const sudsRaw = input.max_suds_count;
  const sudsParsed = Number(sudsRaw);
  const suds =
    sudsRaw === "" || sudsRaw === undefined || sudsRaw === null
      ? null
      : Number.isFinite(sudsParsed)
        ? Math.max(0, Math.floor(sudsParsed))
        : 100;
  const tlRaw = String(input.trong_luong || "").trim().replace(",", ".");
  const tlNum = tlRaw === "" ? NaN : Number(tlRaw);
  const finalTrong = tlRaw === "" || !Number.isFinite(tlNum) ? null : tlNum;

  if (!ma) {
    return { success: false as const, error: "Thiếu mã chi tiết dụng cụ." };
  }
  if (!loaiRaw) {
    return { success: false as const, error: "Bắt buộc chọn loại dụng cụ cho mỗi dòng chi tiết." };
  }
  if (!ten && !loaiRaw) return { success: false as const, error: "Thiếu tên hoặc liên kết loại dụng cụ." };

  if (boRaw) {
    const { data: bo, error: boErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, loai_dung_cu_id")
      .eq("id", boRaw)
      .eq("is_active", true)
      .maybeSingle();
    if (boErr) return { success: false as const, error: boErr.message };
    if (!bo) return { success: false as const, error: "Bộ dụng cụ không tồn tại hoặc đã khóa." };
    const boMa = normalizeBoMa(String((bo as { ma_bo?: string }).ma_bo || ""));
    if (!isCssdUnifiedBoMa(boMa)) {
      return {
        success: false as const,
        error: `Bộ "${boMa || "?"}" chưa có mã chuẩn (B01.SET.01). Sửa tại tab Bộ dụng cụ trước khi thêm thành phần.`,
      };
    }
    const headerLoai = String((bo as { loai_dung_cu_id?: string | null }).loai_dung_cu_id || "").trim();
    if (headerLoai && headerLoai !== loaiRaw) {
      return {
        success: false as const,
        error:
          "Loại dụng cụ của dòng chi tiết phải khớp loại header trên bộ (hoặc cập nhật loại header bộ trước).",
      };
    }
  }

  let finalTen = ten;
  if (!finalTen && loaiRaw) {
    const { data, error } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .select("ten_loai, ma_loai, specs")
      .eq("id", loaiRaw)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    const specsObj = data?.specs && typeof data.specs === "object" ? data.specs : {};
    finalTen = String((specsObj as { ten_loai_dung_cu?: string }).ten_loai_dung_cu || data?.ten_loai || "").trim();
  }
  if (!finalTen) return { success: false as const, error: "Không xác định được tên chi tiết." };

  const payload: Record<string, unknown> = {
    ten_chi_tiet: finalTen,
    ten_dung_cu_le: finalTen,
    bo_dung_cu_id: boRaw ? boRaw : null,
    loai_dung_cu_id: loaiRaw || null,
    so_luong: soLuong,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
    specs: {
      ma_chi_tiet: ma,
      max_suds_count: suds === null ? 100 : suds,
      trong_luong: finalTrong,
      ma_qr_mau: String(input.ma_qr_mau || "").trim() || null,
    },
  };

  // Create without id: nếu đã có active cùng (bo, loai) → ADD so_luong, giữ dòng cũ.
  if (!id && boRaw && loaiRaw) {
    const existing = await findActiveBomLineByBoLoai(supabase, boRaw, loaiRaw);
    if (existing) {
      const nextQty = planAddOntoExistingQty(existing.so_luong, soLuong);
      const { error } = await supabase
        .from("cssd_dm_bo_dung_cu_chi_tiet")
        .update({
          so_luong: nextQty,
          updated_at: payload.updated_at,
        })
        .eq("id", existing.id);
      if (error) return { success: false as const, error: error.message };
      revalidateMasterDataRowCacheTag("cssd_dm_bo_dung_cu_chi_tiet");
      return { success: true as const, id: existing.id, mergedIntoExisting: true as const };
    }
  }

  return upsertMasterRow("cssd_dm_bo_dung_cu_chi_tiet", id, payload);
}

/**
 * ADMIN: gộp dòng trùng loại trên một bộ, hoặc mọi bộ đang có trùng.
 * Null loai bị bỏ qua (không gộp theo tên).
 */
export async function mergeDuplicateBomLinesAction(boId?: string) {
  await verifyPermission("DC_LE", "edit");
  await requireCssdCatalogMasterWrite();
  if (!(await hasRBACAdminSupervisionBypass())) {
    return { success: false as const, error: "Chỉ ADMIN được gộp dòng trùng loại." };
  }

  const supabase = createAdminSupabaseClient();
  const oneBo = String(boId || "").trim();

  try {
    if (oneBo) {
      const r = await mergeDuplicateBomLinesForBo(supabase, oneBo);
      revalidateMasterDataRowCacheTag("cssd_dm_bo_dung_cu_chi_tiet");
      return { success: true as const, ...r };
    }

    const { data: activeRows, error } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("bo_dung_cu_id, loai_dung_cu_id")
      .eq("is_active", true)
      .not("loai_dung_cu_id", "is", null)
      .not("bo_dung_cu_id", "is", null);
    if (error) return { success: false as const, error: error.message };

    const counts = new Map<string, number>();
    for (const row of activeRows || []) {
      const bo = String((row as { bo_dung_cu_id?: string }).bo_dung_cu_id || "").trim();
      const loai = String((row as { loai_dung_cu_id?: string }).loai_dung_cu_id || "").trim();
      if (!bo || !loai) continue;
      const key = `${bo}|${loai}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const boIds = new Set<string>();
    for (const [key, n] of counts) {
      if (n > 1) boIds.add(key.split("|")[0]!);
    }

    let mergedGroups = 0;
    let rowsSoftDeleted = 0;
    let skippedNullLoai = 0;
    const notes: string[] = [];
    for (const id of boIds) {
      const r = await mergeDuplicateBomLinesForBo(supabase, id);
      mergedGroups += r.mergedGroups;
      rowsSoftDeleted += r.rowsSoftDeleted;
      skippedNullLoai += r.skippedNullLoai;
      if (r.note) notes.push(r.note);
    }
    revalidateMasterDataRowCacheTag("cssd_dm_bo_dung_cu_chi_tiet");
    return {
      success: true as const,
      mergedGroups,
      rowsSoftDeleted,
      skippedNullLoai,
      bosTouched: boIds.size,
      note: notes[0],
    };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
