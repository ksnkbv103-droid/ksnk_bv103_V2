"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

interface CreateHoatDongInput {
  id_cong_viec: string;
  loai_hoat_dong: "PHAN_CONG" | "DE_XUAT" | "BAO_CAO_TIEN_DO" | "PHE_DUYET" | "CAP_NHAT" | "HOAN_THANH";
  noi_dung?: string;
  phan_tram_hoan_thanh?: number;
  file_url?: string;
  ten_file?: string;
}

/**
 * Ghi nhận hoạt động mới cho công việc (V2.2)
 * Cột DB: id_cong_viec, loai_hoat_dong, noi_dung, phan_tram_hoan_thanh, trang_thai
 */
export async function createHoatDong(input: CreateHoatDongInput) {
  const supabase = createAdminSupabaseClient();

  // 1. Chèn hoạt động vào bảng fact_cong_viec_hoat_dong
  const { data: hoatDong, error: hdError } = await supabase
    .from("fact_cong_viec_hoat_dong")
    .insert({
      id_cong_viec: input.id_cong_viec,
      loai_hoat_dong: input.loai_hoat_dong,
      noi_dung: input.noi_dung,
      phan_tram_hoan_thanh: input.phan_tram_hoan_thanh ?? 0,
    })
    .select()
    .single();

  if (hdError) {
    console.error("Lỗi ghi nhận hoạt động:", hdError);
    throw new Error("Không thể ghi nhận hoạt động: " + hdError.message);
  }

  // 2. Nếu có file minh chứng, lưu vào bảng fact_cong_viec_file
  if (input.file_url) {
    await supabase
      .from("fact_cong_viec_file")
      .insert({
        id_hoat_dong: hoatDong.id,
        file_url: input.file_url,
        ten_file: input.ten_file || "Minh chứng đính kèm",
      });
  }

  // 3. Cập nhật phần trăm hoàn thành của công việc chính (SSOT trên fact_cong_viec)
  if (input.phan_tram_hoan_thanh !== undefined) {
    const updateData: Record<string, unknown> = {
      phan_tram_hoan_thanh: input.phan_tram_hoan_thanh,
      updated_at: new Date().toISOString(),
    };

    // Tự động chuyển trạng thái dựa trên tiến độ, nhưng KHÔNG tự động Hoàn thành (cần quản lý nghiệm thu)
    if (input.phan_tram_hoan_thanh > 0 && input.phan_tram_hoan_thanh <= 100) {
      updateData.trang_thai = "DANG_THUC_HIEN";
    }

    await supabase
      .from("fact_cong_viec")
      .update(updateData)
      .eq("id", input.id_cong_viec);
  }

  revalidatePath("/quan-ly-cong-viec");
  return hoatDong;
}
