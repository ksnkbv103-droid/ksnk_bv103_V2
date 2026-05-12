"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { normalizeAndValidateDmKhoaPhong } from "@/lib/master-data/validation";
import { normalizeHoSoNhanVienOptionalOrThrow } from "@/lib/master-data/fk-normalize";
import { getActorNhanSuId } from "@/lib/actor-auth-server";

type Payload = Record<string, unknown>;

function clean(payload: Payload): Payload {
  const o = { ...payload };
  Object.keys(o).forEach((k) => {
    if (o[k] === "") o[k] = null;
  });
  return o;
}

async function validateLoaiTrangAndLyDo(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  loai_nkbv_id: string,
  trang_thai_id: string,
  ly_do_loai_tru: unknown,
) {
  const { data: tt, error: et } = await supabase
    .from("dm_trang_thai_nkbv_ca")
    .select("id, ma_trang_thai")
    .eq("id", trang_thai_id)
    .eq("is_active", true)
    .maybeSingle();
  if (et) throw new Error(et.message);
  if (!tt?.id) throw new Error("Trạng thái phiếu không hợp lệ.");

  const { data: lo, error: el } = await supabase
    .from("dm_loai_nkbv")
    .select("id")
    .eq("id", loai_nkbv_id)
    .eq("is_active", true)
    .maybeSingle();
  if (el) throw new Error(el.message);
  if (!lo) throw new Error("Loại NKBV không hợp lệ.");

  const ttMa = String((tt as { ma_trang_thai?: string }).ma_trang_thai || "");
  if (ttMa === "LOAI_TRU" && !String(ly_do_loai_tru ?? "").trim()) {
    throw new Error("Trạng thái Loại trừ: vui lòng nhập lý do loại trừ.");
  }
}

import { giamSatNkbvCaSchema } from "@/lib/validations";

/** Thêm phiếu ca NKBV (nhập tay). */
export async function createGiamSatNkbvCa(payload: Payload) {
  // 1. Validate permissions
  await verifyPermission("GIAM_SAT_NKBV", "create");

  // 2. Validate input schema with Zod
  const parsed = giamSatNkbvCaSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const supabase = createAdminSupabaseClient();
  const raw = clean(payload);
  if (!String(raw.ma_ca ?? "").trim()) return { success: false as const, error: "Mã phiếu không được để trống" };
  if (!String(raw.ho_ten_benh_nhan ?? "").trim()) return { success: false as const, error: "Họ tên bệnh nhân không được để trống" };

  raw.khoa_ghi_nhan_id = await normalizeAndValidateDmKhoaPhong({
    supabase,
    idRaw: raw.khoa_ghi_nhan_id,
    fieldLabel: "Khoa ghi nhận",
    activeOnly: true,
  });
  if (!raw.loai_nkbv_id || !raw.trang_thai_id) return { success: false as const, error: "Vui lòng chọn loại NKBV và trạng thái phiếu" };

  try {
    await validateLoaiTrangAndLyDo(supabase, String(raw.loai_nkbv_id), String(raw.trang_thai_id), raw.ly_do_loai_tru);
    
    const actorNhanSuId = await getActorNhanSuId();
    const finalNguoiGhiId = raw.nguoi_ghi_id || actorNhanSuId;
    
    if (finalNguoiGhiId != null && String(finalNguoiGhiId).trim() !== "") {
      raw.nguoi_ghi_id = await normalizeHoSoNhanVienOptionalOrThrow(supabase, finalNguoiGhiId, "Người ghi");
    } else raw.nguoi_ghi_id = null;

    const insertRow = {
      ma_ca: String(raw.ma_ca).trim(),
      khoa_ghi_nhan_id: raw.khoa_ghi_nhan_id,
      ma_benh_nhan: raw.ma_benh_nhan,
      ho_ten_benh_nhan: String(raw.ho_ten_benh_nhan).trim(),
      ngay_sinh: raw.ngay_sinh ?? null,
      gioi_tinh: raw.gioi_tinh ?? null,
      ngay_vao_vien: raw.ngay_vao_vien ?? null,
      ngay_phat_hien: raw.ngay_phat_hien || new Date().toISOString().slice(0, 10),
      vi_tri_nhiem_khuan: raw.vi_tri_nhiem_khuan ?? null,
      tac_nhan_vi_khuan: raw.tac_nhan_vi_khuan ?? null,
      tom_tat_dien_bien: raw.tom_tat_dien_bien ?? null,
      bien_phap_phong_ngua: raw.bien_phap_phong_ngua ?? null,
      loai_nkbv_id: String(raw.loai_nkbv_id),
      trang_thai_id: String(raw.trang_thai_id),
      ly_do_loai_tru: raw.ly_do_loai_tru ?? null,
      nguoi_ghi_id: raw.nguoi_ghi_id ?? null,
    };
    const { data, error } = await supabase.from("fact_giam_sat_nkbv_ca").insert(insertRow).select().single();
    if (error) return { success: false as const, error: error.message };
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Lỗi lưu" };
  }
}

/** Cập nhật phiếu (ghi nhận / đổi trạng thái…). */
export async function updateGiamSatNkbvCa(id: string, payload: Payload) {
  // 1. Validate permissions
  await verifyPermission("GIAM_SAT_NKBV", "edit");

  // 2. Validate input schema with Zod
  const parsed = giamSatNkbvCaSchema.partial().safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ: " + parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const supabase = createAdminSupabaseClient();
  const raw = clean(payload);
  if (!String(raw.ho_ten_benh_nhan ?? "").trim()) return { success: false as const, error: "Họ tên bệnh nhân không được để trống" };

  raw.khoa_ghi_nhan_id = await normalizeAndValidateDmKhoaPhong({
    supabase,
    idRaw: raw.khoa_ghi_nhan_id,
    fieldLabel: "Khoa ghi nhận",
    activeOnly: true,
  });
  if (!raw.loai_nkbv_id || !raw.trang_thai_id) return { success: false as const, error: "Vui lòng chọn loại NKBV và trạng thái phiếu" };

  try {
    await validateLoaiTrangAndLyDo(supabase, String(raw.loai_nkbv_id), String(raw.trang_thai_id), raw.ly_do_loai_tru);
    
    const actorNhanSuId = await getActorNhanSuId();
    const finalNguoiGhiId = raw.nguoi_ghi_id || actorNhanSuId;
    
    if (finalNguoiGhiId != null && String(finalNguoiGhiId).trim() !== "") {
      raw.nguoi_ghi_id = await normalizeHoSoNhanVienOptionalOrThrow(supabase, finalNguoiGhiId, "Người ghi");
    } else raw.nguoi_ghi_id = null;

    const patch = {
      khoa_ghi_nhan_id: raw.khoa_ghi_nhan_id,
      ma_benh_nhan: raw.ma_benh_nhan,
      ho_ten_benh_nhan: String(raw.ho_ten_benh_nhan).trim(),
      ngay_sinh: raw.ngay_sinh ?? null,
      gioi_tinh: raw.gioi_tinh ?? null,
      ngay_vao_vien: raw.ngay_vao_vien ?? null,
      ngay_phat_hien: raw.ngay_phat_hien,
      vi_tri_nhiem_khuan: raw.vi_tri_nhiem_khuan ?? null,
      tac_nhan_vi_khuan: raw.tac_nhan_vi_khuan ?? null,
      tom_tat_dien_bien: raw.tom_tat_dien_bien ?? null,
      bien_phap_phong_ngua: raw.bien_phap_phong_ngua ?? null,
      loai_nkbv_id: String(raw.loai_nkbv_id),
      trang_thai_id: String(raw.trang_thai_id),
      ly_do_loai_tru: raw.ly_do_loai_tru ?? null,
      nguoi_ghi_id: raw.nguoi_ghi_id ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("fact_giam_sat_nkbv_ca").update(patch).eq("id", id).select().single();
    if (error) return { success: false as const, error: error.message };
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Lỗi lưu" };
  }
}

/** Ẩn phiếu khỏi danh sách (soft delete). */
export async function softDeleteGiamSatNkbvCa(id: string) {
  await verifyPermission("GIAM_SAT_NKBV", "delete");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("fact_giam_sat_nkbv_ca")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}
