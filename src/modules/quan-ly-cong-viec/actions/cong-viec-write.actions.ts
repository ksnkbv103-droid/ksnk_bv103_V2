"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { congViecSchema, type CongViecInput } from "@/lib/validations/quan-ly-cong-viec.validations";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission } from "@/lib/server-permission";

/**
 * Tạo công việc mới (V2.2 — chuẩn tên cột DB)
 */
export async function createCongViec(payload: CongViecInput) {
  // 1. Kiểm tra quyền
  await verifyPermission("QUAN_LY_CONG_VIEC", "create");

  // 2. Validate dữ liệu
  const parsed = congViecSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map(i => i.message).join(", ") };
  }

  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  try {
    const { data, error } = await supabase
      .from("fact_cong_viec")
      .insert({
        ...parsed.data,
        trang_thai: "CHUA_BAT_DAU",
        phan_tram_hoan_thanh: 0,
        is_active: true,
        nguoi_tao_id: actorNhanSuId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Ghi log hoạt động ban đầu
    await supabase.from("fact_cong_viec_hoat_dong").insert({
      id_cong_viec: data.id,
      loai_hoat_dong: "PHAN_CONG",
      nguoi_thuc_hien_id: actorNhanSuId,
      noi_dung: "Khởi tạo công việc",
    });

    revalidatePath("/quan-ly-cong-viec");
    return { success: true as const, data };
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi hệ thống khi tạo công việc" };
  }
}

/**
 * Cập nhật tiến độ / trạng thái
 */
export async function updateCongViecProgress(
  id: string, 
  progress: number, 
  noi_dung: string,
  trang_thai_moi?: string
) {
  await verifyPermission("QUAN_LY_CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  try {
    // 1. Cập nhật bảng chính
    const updateData: Record<string, unknown> = { 
      phan_tram_hoan_thanh: progress,
      updated_at: new Date().toISOString() 
    };
    if (trang_thai_moi) updateData.trang_thai = trang_thai_moi;
    if (progress === 100) updateData.trang_thai = "HOAN_THANH";

    const { error: errUpdate } = await supabase
      .from("fact_cong_viec")
      .update(updateData)
      .eq("id", id);
    
    if (errUpdate) throw errUpdate;

    // 2. Ghi timeline
    await supabase.from("fact_cong_viec_hoat_dong").insert({
      id_cong_viec: id,
      loai_hoat_dong: "BAO_CAO_TIEN_DO",
      nguoi_thuc_hien_id: actorNhanSuId,
      noi_dung,
      phan_tram_hoan_thanh: progress,
      trang_thai: trang_thai_moi || null,
    });

    revalidatePath("/quan-ly-cong-viec");
    return { success: true as const };
  } catch (e: any) {
    return { success: false as const, error: e.message };
  }
}
