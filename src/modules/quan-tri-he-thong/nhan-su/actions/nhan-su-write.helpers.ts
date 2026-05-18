import type { SupabaseClient } from "@supabase/supabase-js";
import type { NhanSu } from "../types";
import {
  LOAI_CHUC_DANH,
  LOAI_CHUC_VU,
  LOAI_TO_CONG_TAC,
  LOAI_VAI_TRO_HE_THONG_KSNK,
} from "../lib/nhan-su-dm-ma-loai";
import { normalizeDanhMucNullableByLoai } from "@/lib/master-data/fk-normalize";
import { normalizeAndValidateDmKhoaPhong, validateDanhMucIdByType } from "@/lib/master-data/validation";

type CurrentFks = {
  khoa_id?: string | null;
  to_id?: string | null;
  chuc_vu_id?: string | null;
  chuc_danh_id?: string | null;
  vai_tro_he_thong_id?: string | null;
} | null;

/** Chuẩn hóa FK trước khi upsert hồ sơ nhân viên (nhãn đọc qua v_mdm_nhan_su_full). */
export async function buildSaveNhanSuMergedFields(
  supabase: SupabaseClient,
  updateData: Omit<Partial<NhanSu>, "id" | "khoa" | "to">,
  current: CurrentFks,
) {
  const [
    khoaNorm,
    toNorm,
    chucVuNorm,
    chucDanhNorm,
    vaiTroNorm,
  ] = await Promise.all([
    normalizeAndValidateDmKhoaPhong({
      supabase,
      idRaw: updateData.khoa_id,
      fieldLabel: "Khoa phòng",
    }),
    normalizeDanhMucNullableByLoai(supabase, updateData.to_id, LOAI_TO_CONG_TAC),
    normalizeDanhMucNullableByLoai(supabase, updateData.chuc_vu_id, LOAI_CHUC_VU),
    normalizeDanhMucNullableByLoai(supabase, updateData.chuc_danh_id, LOAI_CHUC_DANH),
    normalizeDanhMucNullableByLoai(supabase, updateData.vai_tro_he_thong_id, LOAI_VAI_TRO_HE_THONG_KSNK),
  ]);
  if (updateData.to_id && !toNorm) {
    throw new Error("Tổ công tác không hợp lệ: chọn đúng mục loại TO_CONG_TAC trong Danh mục tùy biến.");
  }
  if (updateData.chuc_vu_id && !chucVuNorm) {
    throw new Error("Chức vụ không hợp lệ: chọn lại từ danh mục Chức vụ (CHUC_VU).");
  }
  if (updateData.chuc_danh_id && !chucDanhNorm) {
    throw new Error("Chức danh không hợp lệ: chọn lại từ danh mục (CHUC_DANH).");
  }
  if (updateData.vai_tro_he_thong_id && !vaiTroNorm) {
    throw new Error("Vai trò KSNK không hợp lệ: chọn lại từ danh mục (VAI_TRO_HE_THONG_KSNK).");
  }

  const isChanged = (field: keyof NonNullable<CurrentFks>, nextVal: string | null | undefined) =>
    String(current?.[field] ?? "") !== String(nextVal || "");

  // Chỉ đọc lại tên khi FK thay đổi để giảm query ghi.
  const [cvRes, cdRes, vtRes] = await Promise.all([
    chucVuNorm && isChanged("chuc_vu_id", chucVuNorm)
      ? supabase.from("dm_chuc_vu").select("ten_chuc_vu, is_active").eq("id", chucVuNorm).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    chucDanhNorm && isChanged("chuc_danh_id", chucDanhNorm)
      ? supabase.from("dm_chuc_danh").select("ten_chuc_danh, is_active").eq("id", chucDanhNorm).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    vaiTroNorm && isChanged("vai_tro_he_thong_id", vaiTroNorm)
      ? supabase.from("dm_roles").select("name").eq("id", vaiTroNorm).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (cvRes.error) throw new Error(cvRes.error.message);
  if (cdRes.error) throw new Error(cdRes.error.message);
  if (vtRes.error) throw new Error(vtRes.error.message);

  if (isChanged("chuc_vu_id", chucVuNorm) && cvRes.data?.is_active === false) {
    throw new Error("Chức vụ đã ngưng hoạt động.");
  }
  if (isChanged("chuc_danh_id", chucDanhNorm) && cdRes.data?.is_active === false) {
    throw new Error("Chức danh đã ngưng hoạt động.");
  }
  if (chucVuNorm && isChanged("chuc_vu_id", chucVuNorm) && !cvRes.data?.ten_chuc_vu) {
    throw new Error("Không tìm thấy tên chức vụ trong danh mục.");
  }
  if (chucDanhNorm && isChanged("chuc_danh_id", chucDanhNorm) && !cdRes.data?.ten_chuc_danh) {
    throw new Error("Không tìm thấy tên chức danh trong danh mục.");
  }
  if (vaiTroNorm && isChanged("vai_tro_he_thong_id", vaiTroNorm) && !(vtRes.data as { name?: string } | null)?.name) {
    throw new Error("Không tìm thấy vai trò hệ thống trong danh mục.");
  }

  const merged = {
    ...updateData,
    khoa_id: khoaNorm,
    to_id: toNorm,
    chuc_vu_id: chucVuNorm,
    chuc_danh_id: chucDanhNorm,
    vai_tro_he_thong_id: vaiTroNorm,
  };
  delete (merged as Record<string, unknown>).chuc_vu;
  delete (merged as Record<string, unknown>).chuc_danh;
  delete (merged as Record<string, unknown>).vai_tro_he_thong_ksnk;
  await validateDanhMucIdByType({
    supabase,
    id: merged.to_id || null,
    maLoai: LOAI_TO_CONG_TAC,
    fieldLabel: "Tổ công tác",
    activeOnly: isChanged("to_id", merged.to_id),
  });

  return merged;
}
