"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { FACT_CONG_VIEC_DINH_KY_ROW_SELECT } from "../lib/qlcv-dinh-ky-select";
import { QLCV_DINH_KY_TABLE } from "../lib/qlcv-dinh-ky-write";
import { formatQlcvDbError, throwQlcvDbError } from "../lib/qlcv-supabase-error";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { validateAssigneeForQlcv } from "../lib/qlcv-ksnk-server";
import { normalizeQlcvStaffIdList } from "../lib/qlcv-staff-ids";
import { assertQlcvTimeRange, normalizeTimeHHmm } from "../lib/qlcv-time";

export type MaChuKyDinhKy = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export type MucDoUuTienDinhKy = "THAP" | "TRUNG_BINH" | "CAO" | "KHAN_CAP";

export interface DinhKyMauRow {
  id: string;
  tieu_de: string;
  mo_ta: string | null;
  ma_chu_ky: MaChuKyDinhKy;
  ngay_bat_dau: string;
  nguoi_phu_trach_id: string | null;
  to_cong_tac_id: string | null;
  /** Thêm migration 20260530150000 */
  muc_do_uu_tien: MucDoUuTienDinhKy | null;
  vi_tri_thuc_hien: string | null;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  dia_diem_khoa_id: string | null;
  nguoi_phoi_hop_ids: string[] | null;
  nguoi_theo_doi_ids: string[] | null;
  nhiem_vu_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listDinhKyMau(): Promise<DinhKyMauRow[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const { data, error } = await supabase
    .from(QLCV_DINH_KY_TABLE)
    .select(FACT_CONG_VIEC_DINH_KY_ROW_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[QLCV] listDinhKyMau", error);
    throw new Error(formatQlcvDbError(error.message || "Không tải được mẫu định kỳ."));
  }
  return (data || []) as DinhKyMauRow[];
}

export async function upsertDinhKyMau(input: {
  id?: string;
  tieu_de: string;
  mo_ta?: string | null;
  ma_chu_ky: MaChuKyDinhKy;
  ngay_bat_dau: string;
  nguoi_phu_trach_id?: string | null;
  to_cong_tac_id?: string | null;
  muc_do_uu_tien?: MucDoUuTienDinhKy | null;
  vi_tri_thuc_hien?: string | null;
  gio_bat_dau?: string | null;
  gio_ket_thuc?: string | null;
  dia_diem_khoa_id?: string | null;
  nguoi_phoi_hop_ids?: string[];
  nguoi_theo_doi_ids?: string[];
  nhiem_vu_id?: string | null;
  is_active?: boolean;
}) {
  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("edit");
  const actor = await getActorNhanSuId();
  const now = new Date().toISOString();

  if (input.nguoi_phu_trach_id) {
    await validateAssigneeForQlcv(supabase, input.nguoi_phu_trach_id, ksnkKhoaId);
  }
  const phoiHop = normalizeQlcvStaffIdList(input.nguoi_phoi_hop_ids);
  const theoDoi = normalizeQlcvStaffIdList(input.nguoi_theo_doi_ids);
  for (const sid of [...phoiHop, ...theoDoi]) {
    await validateAssigneeForQlcv(supabase, sid, ksnkKhoaId);
  }

  if (!input.dia_diem_khoa_id) {
    throw new Error("Chọn khoa/đơn vị địa điểm thực hiện (danh mục khoa).");
  }
  const { data: khoaOk, error: khoaErr } = await supabase
    .from("mdm_dm_khoa_phong")
    .select("id")
    .eq("id", input.dia_diem_khoa_id)
    .eq("is_active", true)
    .maybeSingle();
  if (khoaErr) throwQlcvDbError(khoaErr, "Không kiểm tra được khoa địa điểm.");
  if (!khoaOk) throw new Error("Khoa/đơn vị địa điểm không hợp lệ hoặc đã ngưng.");

  const gioBat = normalizeTimeHHmm(input.gio_bat_dau);
  const gioKet = normalizeTimeHHmm(input.gio_ket_thuc);
  assertQlcvTimeRange(gioBat, gioKet);

  if (!input.id && !actor) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới tạo được mẫu định kỳ.");
  }

  const row = {
    tieu_de: input.tieu_de,
    mo_ta: input.mo_ta ?? null,
    ma_chu_ky: input.ma_chu_ky,
    ngay_bat_dau: input.ngay_bat_dau,
    nguoi_phu_trach_id: input.nguoi_phu_trach_id ?? null,
    to_cong_tac_id: input.to_cong_tac_id ?? null,
    muc_do_uu_tien: input.muc_do_uu_tien ?? "TRUNG_BINH",
    vi_tri_thuc_hien: input.vi_tri_thuc_hien?.trim() || null,
    gio_bat_dau: gioBat,
    gio_ket_thuc: gioKet,
    dia_diem_khoa_id: input.dia_diem_khoa_id,
    nguoi_phoi_hop_ids: phoiHop,
    nguoi_theo_doi_ids: theoDoi,
    nhiem_vu_id: input.nhiem_vu_id ?? null,
    is_active: input.is_active ?? true,
    updated_at: now,
  };

  if (input.id) {
    const { error } = await supabase.from(QLCV_DINH_KY_TABLE).update(row).eq("id", input.id);
    if (error) throwQlcvDbError(error, "Không cập nhật mẫu định kỳ.");
  } else {
    const { error } = await supabase.from(QLCV_DINH_KY_TABLE).insert({ ...row, nguoi_tao_id: actor });
    if (error) throwQlcvDbError(error, "Không tạo mẫu định kỳ.");
  }

  revalidatePath("/quan-ly-cong-viec");
}

export async function setDinhKyMauActive(id: string, is_active: boolean) {
  const { supabase } = await ensureQlcvKsnkAccess("edit");
  const { error } = await supabase
    .from(QLCV_DINH_KY_TABLE)
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throwQlcvDbError(error, "Không đổi trạng thái mẫu.");
  revalidatePath("/quan-ly-cong-viec");
}

/**
 * Xóa mẫu định kỳ.
 * - Còn phiếu gắn `dinh_ky_mau_id` → chỉ tắt (`is_active=false`), giữ lịch sử.
 * - Không còn phiếu → hard delete.
 */
export async function deleteDinhKyMau(id: string): Promise<{ mode: "deleted" | "deactivated" }> {
  const { supabase } = await ensureQlcvKsnkAccess("edit");

  const { count, error: countErr } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("id", { count: "exact", head: true })
    .eq("dinh_ky_mau_id", id);
  if (countErr) throwQlcvDbError(countErr, "Không kiểm tra được phiếu gắn mẫu.");

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from(QLCV_DINH_KY_TABLE)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throwQlcvDbError(error, "Không ngừng mẫu định kỳ.");
    revalidatePath("/quan-ly-cong-viec");
    return { mode: "deactivated" };
  }

  const { error } = await supabase.from(QLCV_DINH_KY_TABLE).delete().eq("id", id);
  if (error) throwQlcvDbError(error, "Không xóa được mẫu định kỳ.");
  revalidatePath("/quan-ly-cong-viec");
  return { mode: "deleted" };
}

/** Gọi RPC sinh instance cho hôm nay (pg_cron / thủ công). */
export async function spawnCongViecDinhKyHomNay(): Promise<{ inserted: number }> {
  const { supabase } = await ensureQlcvKsnkAccess("edit");
  const { data, error } = await supabase.rpc("fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay");
  if (error) throw new Error(error.message);
  revalidatePath("/quan-ly-cong-viec");
  return { inserted: typeof data === "number" ? data : Number(data) || 0 };
}
