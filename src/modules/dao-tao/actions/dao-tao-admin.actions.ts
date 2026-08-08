"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { requireDaoTaoUser } from "@/modules/dao-tao/lib/dao-tao-auth";

export async function listMucDoThiThu() {
  await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("loai_cau_hinh", "thi_thu_muc_do")
    .eq("is_active", true)
    .order("thu_tu");
  if (error) throw error;
  return data ?? [];
}

export async function updateMucDoThiThu(input: {
  id: string;
  so_cau: number;
  thoi_gian_phut: number;
  bloom_quota?: Record<string, number>;
  loai_quota?: Record<string, number>;
}) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("dao_tao_cau_hinh")
    .update({
      so_cau: input.so_cau,
      thoi_gian_phut: input.thoi_gian_phut,
      bloom_quota: input.bloom_quota,
      loai_quota: input.loai_quota,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("loai_cau_hinh", "thi_thu_muc_do");
  if (error) throw error;
  return { ok: true };
}

export type KyThiInput = {
  ten: string;
  mo_ta?: string;
  so_cau: number;
  thoi_gian_phut: number;
  diem_dat_pct: number;
  bloom_quota?: Record<string, number>;
  loai_quota?: Record<string, number>;
  chu_de_mas?: string[];
  so_lan_cho_phep?: number;
  shuffle_cau?: boolean;
  shuffle_dap_an?: boolean;
};

export async function createKyThiThat(input: KyThiInput) {
  await verifyPermission("DAO_TAO", "create");
  const { user } = await requireDaoTaoUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .insert({
      loai_cau_hinh: "thi_that",
      ten: input.ten,
      mo_ta: input.mo_ta ?? null,
      so_cau: input.so_cau,
      thoi_gian_phut: input.thoi_gian_phut,
      diem_dat_pct: input.diem_dat_pct,
      bloom_quota: input.bloom_quota ?? {
        "1": 0.25,
        "2": 0.3,
        "3": 0.3,
        "4": 0.15,
        "5": 0,
      },
      loai_quota: input.loai_quota ?? {
        single: 0.5,
        multi: 0.2,
        true_false_cluster: 0.15,
        order: 0.15,
      },
      chu_de_mas: input.chu_de_mas ?? [],
      gan: { khoa_ids: [], nhan_su_ids: [] },
      so_lan_cho_phep: input.so_lan_cho_phep ?? 1,
      shuffle_cau: input.shuffle_cau ?? true,
      shuffle_dap_an: input.shuffle_dap_an ?? true,
      trang_thai: "draft",
      created_by: user.id,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateKyThiThat(
  id: string,
  patch: Partial<KyThiInput> & { trang_thai?: "draft" | "published" | "closed" },
) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("loai_cau_hinh", "thi_that")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listKyThiThatAdmin() {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dao_tao_cau_hinh")
    .select("*")
    .eq("loai_cau_hinh", "thi_that")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const gan = (row.gan ?? {}) as { khoa_ids?: string[]; nhan_su_ids?: string[] };
    const khoaIds = gan.khoa_ids ?? [];
    return {
      ...row,
      /** Compat UI cũ */
      dao_tao_ky_thi_gan: khoaIds.map((khoa_phong_id) => ({
        id: khoa_phong_id,
        khoa_phong_id,
      })),
    };
  });
}

export async function setKyThiGan(input: {
  kyThiId: string;
  khoaPhongIds?: string[];
  nhanSuIds?: string[];
}) {
  await verifyPermission("DAO_TAO", "edit");
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("dao_tao_cau_hinh")
    .update({
      gan: {
        khoa_ids: input.khoaPhongIds ?? [],
        nhan_su_ids: input.nhanSuIds ?? [],
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.kyThiId)
    .eq("loai_cau_hinh", "thi_that");
  if (error) throw error;
  return { ok: true };
}

export async function listKetQuaKyThi(kyThiId?: string) {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  let q = admin
    .from("dao_tao_lan_thi")
    .select(
      "id, che_do, cau_hinh_id, form_thong_tin, diem_so, diem_toi_da, diem_pct, dat, trang_thai, bat_dau_luc, nop_luc, so_cau",
    )
    .eq("che_do", "thi_that")
    .in("trang_thai", ["da_nop", "het_gio"])
    .order("nop_luc", { ascending: false })
    .limit(200);
  if (kyThiId) q = q.eq("cau_hinh_id", kyThiId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listKhoaPhongOptions() {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mdm_dm_khoa_phong")
    .select("id, ten_khoa, ma_khoa")
    .eq("is_active", true)
    .order("ten_khoa")
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function listNhanSuOptions(filters?: { khoaIds?: string[]; q?: string }) {
  await verifyPermission("DAO_TAO", "view");
  const admin = createAdminSupabaseClient();
  let q = admin
    .from("mdm_nhan_su")
    .select("id, ho_ten, ma_nv, khoa_id")
    .eq("is_active", true)
    .order("ho_ten")
    .limit(400);
  if (filters?.khoaIds?.length) {
    q = q.in("khoa_id", filters.khoaIds);
  }
  const { data, error } = await q;
  if (error) throw error;
  const needle = (filters?.q ?? "").trim().toLowerCase();
  if (!needle) return data ?? [];
  return (data ?? []).filter(
    (r) =>
      (r.ho_ten ?? "").toLowerCase().includes(needle) ||
      (r.ma_nv ?? "").toLowerCase().includes(needle),
  );
}
