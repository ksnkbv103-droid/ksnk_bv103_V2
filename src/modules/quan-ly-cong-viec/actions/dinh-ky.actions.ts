"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { FACT_CONG_VIEC_DINH_KY_ROW_SELECT } from "../lib/qlcv-dinh-ky-select";

export type MaChuKyDinhKy = "WEEKLY" | "MONTHLY";

export interface DinhKyMauRow {
  id: string;
  tieu_de: string;
  mo_ta: string | null;
  ma_chu_ky: MaChuKyDinhKy;
  ngay_bat_dau: string;
  nguoi_phu_trach_id: string | null;
  to_cong_tac_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listDinhKyMau(): Promise<DinhKyMauRow[]> {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("fact_cong_viec_dinh_ky")
    .select(FACT_CONG_VIEC_DINH_KY_ROW_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listDinhKyMau", error);
    throw new Error("Không tải được mẫu định kỳ.");
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
  is_active?: boolean;
}) {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const actor = await getActorNhanSuId();
  const now = new Date().toISOString();

  const row = {
    tieu_de: input.tieu_de,
    mo_ta: input.mo_ta ?? null,
    ma_chu_ky: input.ma_chu_ky,
    ngay_bat_dau: input.ngay_bat_dau,
    nguoi_phu_trach_id: input.nguoi_phu_trach_id ?? null,
    to_cong_tac_id: input.to_cong_tac_id ?? null,
    is_active: input.is_active ?? true,
    updated_at: now,
  };

  if (input.id) {
    const { error } = await supabase.from("fact_cong_viec_dinh_ky").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("fact_cong_viec_dinh_ky").insert({ ...row, nguoi_tao_id: actor });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/quan-ly-cong-viec");
}

export async function setDinhKyMauActive(id: string, is_active: boolean) {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("fact_cong_viec_dinh_ky")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quan-ly-cong-viec");
}

/** Gọi RPC sinh instance cho hôm nay (pg_cron / thủ công). */
export async function spawnCongViecDinhKyHomNay(): Promise<{ inserted: number }> {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("fn_fact_cong_viec_spawn_dinh_ky_hom_nay");
  if (error) throw new Error(error.message);
  revalidatePath("/quan-ly-cong-viec");
  return { inserted: typeof data === "number" ? data : Number(data) || 0 };
}
