"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { CongViecInput } from "./index";

// ==================== CREATE ====================
export async function createCongViec(input: CongViecInput) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("fact_cong_viec")
    .insert({
      tieu_de: input.tieu_de,
      mo_ta: input.mo_ta,
      loai_pham_vi: input.loai_pham_vi,
      loai_cong_viec: input.loai_cong_viec,
      muc_do_uu_tien: input.muc_do_uu_tien || "TRUNG_BINH",
      han_hoan_thanh: input.han_hoan_thanh || null,
      nguoi_phu_trach_id: input.nguoi_phu_trach_id || null,
      khoa_thuc_hien_id: input.khoa_thuc_hien_id || null,
      to_cong_tac_id: input.to_cong_tac_id || null,
      cong_viec_cha_id: input.cong_viec_cha_id || null,
      trang_thai: "CHUA_BAT_DAU",
      phan_tram_hoan_thanh: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Lỗi tạo công việc:", error);
    throw new Error("Không thể tạo công việc: " + error.message);
  }

  // Ghi log hoạt động
  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: data.id,
    loai_hoat_dong: "PHAN_CONG",
    noi_dung: "Tạo công việc mới",
  });

  revalidatePath("/quan-ly-cong-viec");
  return data;
}

// ==================== GET LIST (from View) ====================
export async function getCongViecList() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("v_fact_cong_viec_full")
    .select("*")
    .is("cong_viec_cha_id", null) 
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi lấy danh sách công việc:", error);
    throw new Error("Không thể tải danh sách công việc");
  }

  return data || [];
}

type CongViecUpdateInput = Partial<CongViecInput> & {
  trang_thai?: string;
  phan_tram_hoan_thanh?: number;
};

// ==================== UPDATE ====================
export async function updateCongViec(id: string, updates: CongViecUpdateInput) {
  const supabase = createAdminSupabaseClient();

  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
    is_active: true, // Mặc định kích hoạt khi có tác động từ Admin
  };

  // Sử dụng kiểm tra undefined để cho phép cập nhật null
  if (updates.tieu_de !== undefined) dbUpdates.tieu_de = updates.tieu_de;
  if (updates.mo_ta !== undefined) dbUpdates.mo_ta = updates.mo_ta;
  if (updates.loai_pham_vi !== undefined) dbUpdates.loai_pham_vi = updates.loai_pham_vi;
  if (updates.loai_cong_viec !== undefined) dbUpdates.loai_cong_viec = updates.loai_cong_viec;
  if (updates.muc_do_uu_tien !== undefined) dbUpdates.muc_do_uu_tien = updates.muc_do_uu_tien;
  if (updates.han_hoan_thanh !== undefined) dbUpdates.han_hoan_thanh = updates.han_hoan_thanh;
  if (updates.nguoi_phu_trach_id !== undefined) dbUpdates.nguoi_phu_trach_id = updates.nguoi_phu_trach_id;
  if (updates.khoa_thuc_hien_id !== undefined) dbUpdates.khoa_thuc_hien_id = updates.khoa_thuc_hien_id;
  if (updates.to_cong_tac_id !== undefined) dbUpdates.to_cong_tac_id = updates.to_cong_tac_id;
  if (updates.trang_thai !== undefined) dbUpdates.trang_thai = updates.trang_thai;
  if (updates.phan_tram_hoan_thanh !== undefined) dbUpdates.phan_tram_hoan_thanh = updates.phan_tram_hoan_thanh;

  const { data, error } = await supabase
    .from("fact_cong_viec")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Lỗi cập nhật DB:", error);
    throw new Error(`Cập nhật thất bại: ${error.message}`);
  }

  revalidatePath("/quan-ly-cong-viec");
  return { success: true, data };
}

// ==================== GET DETAIL ====================
export async function getCongViecDetail(id: string) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("fact_cong_viec")
    .select(`
      *,
      nguoi_tao:mdm_nhan_su!nguoi_tao_id(ho_ten),
      nguoi_phu_trach:mdm_nhan_su!nguoi_phu_trach_id(ho_ten),
      khoa:dm_khoa_phong!khoa_thuc_hien_id(ten_khoa),
      to_cong_tac:dm_to_cong_tac!to_cong_tac_id(ten_to),
      hoat_dong:fact_cong_viec_hoat_dong(
        *,
        nguoi:mdm_nhan_su!nguoi_thuc_hien_id(ho_ten),
        files:fact_cong_viec_file(*)
      ),
      cong_viec_con:fact_cong_viec(
        id, tieu_de, trang_thai, phan_tram_hoan_thanh
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Lỗi lấy chi tiết công việc:", error);
    throw new Error("Không thể tải chi tiết công việc: " + error.message);
  }

  return data;
}

// ==================== XÁC NHẬN HOÀN THÀNH ====================
export async function xacNhanHoanThanh(id: string) {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("fact_cong_viec")
    .update({
      trang_thai: "HOAN_THANH",
      phan_tram_hoan_thanh: 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Lỗi xác nhận hoàn thành:", error);
    throw new Error("Không thể xác nhận hoàn thành công việc.");
  }

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "HOAN_THANH",
    noi_dung: "Đã xác nhận hoàn thành công việc.",
    phan_tram_hoan_thanh: 100,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}

// ==================== XÓA ====================
export async function deleteCongViec(id: string) {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("fact_cong_viec")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Lỗi xóa công việc:", error);
    throw new Error("Không thể xóa công việc này.");
  }

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}
