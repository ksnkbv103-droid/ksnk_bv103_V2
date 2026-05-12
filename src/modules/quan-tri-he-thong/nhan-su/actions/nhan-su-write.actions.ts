"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { NhanSu } from "./data";
import { softDeleteManySafeRows, softDeleteSafeRow, upsertSafeRow } from "../../actions/master-crud-safe-core";
import { formatHoSoNhanSuWriteError } from "./nhan-su-fk-normalize";
import { buildSaveNhanSuMergedFields } from "./nhan-su-write.helpers";
import { verifyPermission } from "../../actions/verify-permission";

function errNhanSuWrite(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

import { nhanSuSchema } from "@/lib/validations";

/**
 * Lưu hồ sơ nhân sự (Thêm hoặc Cập nhật)
 */
export async function saveNhanSuAction(data: Partial<NhanSu>) {
  try {
    const { id, khoa: _k, to: _t, nghe_nghiep: _nn, ...updateData } = data;
    // 1. Validate permissions
    await verifyPermission("NHAN_SU", id ? "edit" : "create");
    const supabase = createAdminSupabaseClient();

    // 2. Validate input schema with Zod
    const parsed = nhanSuSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    let current: {
      to_id?: string | null;
      chuc_vu_id?: string | null;
      chuc_danh_id?: string | null;
      vai_tro_he_thong_id?: string | null;
    } | null = null;
    if (id) {
      const { data: existing, error: exErr } = await supabase
        .from("mdm_nhan_su")
        .select("khoa_id, to_id, chuc_vu_id, chuc_danh_id, vai_tro_he_thong_id")
        .eq("id", id)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);
      current =
        (existing as {
          khoa_id?: string | null;
          to_id?: string | null;
          chuc_vu_id?: string | null;
          chuc_danh_id?: string | null;
          vai_tro_he_thong_id?: string | null;
        } | null) || null;
    }

    const merged = await buildSaveNhanSuMergedFields(supabase, updateData, current);
    const payload = id ? { ...merged, updated_at: new Date().toISOString() } : merged;
    const result = await upsertSafeRow("mdm_nhan_su", id || "", payload as Record<string, unknown>);
    if (!result.success) throw new Error(formatHoSoNhanSuWriteError(result.error) || result.error);

    revalidatePath("/quan-tri-he-thong");
    return { success: true, message: id ? "Cập nhật thành công" : "Thêm nhân sự mới thành công" };
  } catch (error: unknown) {
    const msg = errNhanSuWrite(error);
    console.error("LỖI saveNhanSuAction:", error);
    if (msg.includes("fetch failed")) {
      return {
        success: false,
        error: `Không thể kết nối đến máy chủ Supabase (Kiểm tra internet hoặc DNS): ${msg}`,
      };
    }
    return { success: false, error: msg || "Có lỗi xảy ra khi lưu hồ sơ nhân sự." };
  }
}

/**
 * Xóa hồ sơ nhân sự
 */
export async function deleteNhanSuAction(id: string) {
  try {
    await verifyPermission("NHAN_SU", "delete");
    // Chuẩn V5.0: chỉ vô hiệu hóa hồ sơ, không xóa cứng.
    const result = await softDeleteSafeRow("mdm_nhan_su", id);
    if (!result.success) throw new Error(result.error);

    revalidatePath("/quan-tri-he-thong");
    return { success: true, message: "Đã xóa hồ sơ nhân sự thành công" };
  } catch (error: unknown) {
    console.error("LỖI deleteNhanSuAction:", error);
    return {
      success: false,
      error: `Không thể xóa nhân sự: ${errNhanSuWrite(error) || "Lỗi kết nối"}`,
    };
  }
}

/**
 * Xóa hàng loạt nhân sự
 */
export async function deleteBulkNhanSuAction(ids: string[]) {
  try {
    await verifyPermission("NHAN_SU", "delete");
    // Chuẩn V5.0: soft delete hàng loạt.
    const result = await softDeleteManySafeRows("mdm_nhan_su", ids);
    if (!result.success) throw new Error(result.error);

    revalidatePath("/quan-tri-he-thong");
    return { success: true, message: `Đã xóa ${ids.length} hồ sơ nhân sự thành công` };
  } catch (error: unknown) {
    console.error("LỖI deleteBulkNhanSuAction:", error);
    return {
      success: false,
      error: `Không thể xóa hàng loạt: ${errNhanSuWrite(error) || "Lỗi kết nối"}`,
    };
  }
}
