"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export interface CreateDeXuatInput {
  tieu_de: string;
  mo_ta?: string;
  loai_pham_vi: "NOI_BO" | "MANG_LUOI";
  han_hoan_thanh?: string;
  loai_cong_viec?: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien?: "CAO" | "TRUNG_BINH" | "THAP";
}

/**
 * Gửi đề xuất công việc mới 
 * is_active = false: Đánh dấu là đề xuất đang chờ phê duyệt
 */
export async function createDeXuat(input: CreateDeXuatInput) {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("fact_cong_viec")
    .insert({
      tieu_de: input.tieu_de,
      mo_ta: input.mo_ta,
      loai_pham_vi: input.loai_pham_vi,
      loai_cong_viec: input.loai_cong_viec || "DOT_XUAT",
      muc_do_uu_tien: input.muc_do_uu_tien || "TRUNG_BINH",
      han_hoan_thanh: input.han_hoan_thanh || null,
      trang_thai: "CHUA_BAT_DAU",
      phan_tram_hoan_thanh: 0,
      is_active: false, // CHƯA DUYỆT
    })
    .select()
    .single();

  if (error) {
    console.error("Lỗi gửi đề xuất:", error);
    throw new Error("Không thể gửi đề xuất công việc: " + error.message);
  }

  // Ghi log hoạt động
  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: data.id,
    loai_hoat_dong: "DE_XUAT",
    noi_dung: "Gửi đề xuất công việc mới",
  });

  revalidatePath("/quan-ly-cong-viec");
  return data;
}

/**
 * Phê duyệt hoặc Từ chối đề xuất
 * Duyệt -> is_active = true
 * Từ chối -> DA_HUY (is_active vẫn false hoặc tùy ý)
 */
export async function pheDuyetDeXuat(id: string, duyet: boolean, ly_do?: string) {
  const supabase = createAdminSupabaseClient();
  const trang_thai_moi = duyet ? "CHUA_BAT_DAU" : "DA_HUY";

  const { error } = await supabase
    .from("fact_cong_viec")
    .update({ 
      trang_thai: trang_thai_moi,
      is_active: duyet ? true : false, // Kích hoạt nếu duyệt
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error("Lỗi phê duyệt:", error);
    throw new Error("Không thể thực hiện thao tác phê duyệt.");
  }

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "PHE_DUYET",
    noi_dung: duyet ? "Đã phê duyệt đề xuất" : `Đã từ chối đề xuất. Lý do: ${ly_do || "Không có"}`,
    trang_thai: trang_thai_moi,
  });

  revalidatePath("/quan-ly-cong-viec");
}

/**
 * Lấy danh sách đề xuất (Chỉ lấy những bản ghi chưa kích hoạt)
 */
export async function getPendingDeXuat() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("fact_cong_viec")
    .select(`
      *,
      nguoi_tao:mdm_nhan_su!nguoi_tao_id(ho_ten)
    `)
    .eq("is_active", false) // CHỈ LẤY ĐỀ XUẤT CHƯA DUYỆT
    .neq("trang_thai", "DA_HUY") // Bỏ qua cái đã hủy
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi tải đề xuất:", error);
    throw new Error("Không thể tải danh sách đề xuất");
  }

  return (data || []).map(item => ({
    ...item,
    nguoi_tao_ten: item.nguoi_tao?.ho_ten || "Chưa xác định"
  }));
}
