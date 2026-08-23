"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { isCssdUnifiedBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import { upsertMasterRow } from "./master-crud-core";

/** Lưu một dòng thành phần bộ — gọi từ panel trong tab Bộ. */
export async function saveDungCuChiTietAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("DC_LE", id ? "edit" : "create");
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

  return upsertMasterRow("cssd_dm_bo_dung_cu_chi_tiet", id, payload);
}
