"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { NhanSu } from "../types";
import {
  upsertMasterRow,
} from "../../danh-muc/actions/master-crud-core";
import { formatHoSoNhanSuWriteError } from "./nhan-su-fk-normalize";
import { buildSaveNhanSuMergedFields } from "./nhan-su-write.helpers";
import { verifyPermission } from "../../actions/verify-permission";

function errNhanSuWrite(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

import { nhanSuSchema } from "@/lib/validations";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { syncStaffAuthEmail } from "@/lib/auth/staff-auth-email";

/**
 * Lưu hồ sơ nhân sự (Thêm hoặc Cập nhật)
 */
export async function saveNhanSuAction(data: Partial<NhanSu>) {
  try {
    const { id, khoa: _k, to: _t, nghe_nghiep: _nn, ...updateData } = data;
    // 1. Validate permissions
    await verifyPermission("NHAN_SU", id ? "edit" : "create");
    const supabase = createAdminSupabaseClient();

    const parsed = id
      ? nhanSuSchema.partial().safeParse(updateData)
      : nhanSuSchema.safeParse(updateData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const validatedData = parsed.data;
    
    // Tách các trường động thuộc extra_data ra khỏi payload vật lý
    const {
      email,
      so_dien_thoai,
      ngay_sinh,
      gioi_tinh,
      ...physicalFields
    } = validatedData as any;

    let existingExtraData = {};
    let current: {
      to_id?: string | null;
      chuc_vu_id?: string | null;
      chuc_danh_id?: string | null;
      vai_tro_he_thong_id?: string | null;
    } | null = null;

    let existingAuthUserId: string | null = null;

    if (id) {
      const { data: existing, error: exErr } = await supabase
        .from("mdm_nhan_su")
        .select("khoa_id, to_id, chuc_vu_id, chuc_danh_id, vai_tro_he_thong_id, extra_data, auth_user_id")
        .eq("id", id)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (existing) {
        current = existing as any;
        existingExtraData = existing.extra_data || {};
        existingAuthUserId = existing.auth_user_id ?? null;
      }
    }

    const mergedExtraData = {
      ...existingExtraData,
      ...(email !== undefined ? { email } : {}),
      ...(so_dien_thoai !== undefined ? { so_dien_thoai } : {}),
      ...(ngay_sinh !== undefined ? { ngay_sinh } : {}),
      ...(gioi_tinh !== undefined ? { gioi_tinh } : {}),
    };

    if (id && existingAuthUserId && email !== undefined) {
      const oldEmail = normalizeEmail(String((existingExtraData as { email?: string }).email || ""));
      const newEmail = normalizeEmail(String(email));
      if (newEmail && newEmail !== oldEmail) {
        const syncRes = await syncStaffAuthEmail(supabase, existingAuthUserId, newEmail);
        if (!syncRes.ok) {
          return {
            success: false,
            error: `Không đồng bộ được email đăng nhập: ${syncRes.error}`,
          };
        }
      }
    }

    const merged = await buildSaveNhanSuMergedFields(supabase, physicalFields, current);
    const payload = {
      ...merged,
      extra_data: mergedExtraData,
      ...(id ? { updated_at: new Date().toISOString() } : {}),
    };

    const result = await upsertMasterRow("mdm_nhan_su", id || "", payload as Record<string, unknown>);
    if (!result.success) throw new Error(formatHoSoNhanSuWriteError(result.error) || result.error);

    const maNv = String(payload.ma_nv || "").trim();
    let savedId = id || "";
    if (!savedId && maNv) {
      const { data: saved } = await supabase.from("mdm_nhan_su").select("id").eq("ma_nv", maNv).maybeSingle();
      savedId = saved?.id ? String(saved.id) : "";
    }

    revalidatePath("/quan-tri-he-thong");
    return {
      success: true,
      message: id ? "Cập nhật thành công" : "Thêm nhân sự mới thành công",
      id: savedId || undefined,
    };
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

