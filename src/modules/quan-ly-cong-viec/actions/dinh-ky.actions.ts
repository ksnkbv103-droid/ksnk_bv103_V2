"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { FACT_CONG_VIEC_DINH_KY_ROW_SELECT } from "../lib/qlcv-dinh-ky-select";
import { QLCV_DINH_KY_TABLE } from "../lib/qlcv-dinh-ky-write";
import { formatQlcvDbError, throwQlcvDbError } from "../lib/qlcv-supabase-error";

export type MaChuKyDinhKy = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

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
  /** Thêm migration 20260530150000 */
  khoa_thuc_hien_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listDinhKyMau(): Promise<DinhKyMauRow[]> {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
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
  khoa_thuc_hien_id?: string | null;
  is_active?: boolean;
}) {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const actor = await getActorNhanSuId();
  const now = new Date().toISOString();

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
    khoa_thuc_hien_id: input.khoa_thuc_hien_id ?? null,
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
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(QLCV_DINH_KY_TABLE)
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throwQlcvDbError(error, "Không đổi trạng thái mẫu.");
  revalidatePath("/quan-ly-cong-viec");
}

/** Gọi RPC sinh instance cho hôm nay (pg_cron / thủ công). */
export async function spawnCongViecDinhKyHomNay(): Promise<{ inserted: number }> {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay");
  if (error) throw new Error(error.message);
  revalidatePath("/quan-ly-cong-viec");
  return { inserted: typeof data === "number" ? data : Number(data) || 0 };
}
