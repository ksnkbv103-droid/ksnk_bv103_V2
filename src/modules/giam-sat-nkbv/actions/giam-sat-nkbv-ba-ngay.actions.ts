"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { isDeviceDateInStay } from "../lib/nkbv-ba-device-timeline";
import { criteriaKeyToDungCuLoai } from "../lib/nkbv-ba-ngay";
import { syncNkbvPhieuFromBaNgay } from "../lib/nkbv-ba-ngay-sync";
import { vnYmd } from "@/lib/format-datetime-vi";
import { nkbvBaNgayDungCuSchema, nkbvBaNgayKhoaSchema } from "@/lib/validations/giam-sat-nkbv.validations";

/** Re-export cho ba-analysis (cùng entry server). */
export { syncNkbvPhieuFromBaNgay };

async function stayBounds(ma: string): Promise<
  { ok: true; vv: string; rv: string | null } | { ok: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("nkbv_fact_benh_an")
    .select("ngay_vao_vien, ngay_ra_vien")
    .eq("ma_benh_an", ma)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Không tìm thấy bệnh án" };
  return {
    ok: true,
    vv: vnYmd(data.ngay_vao_vien),
    rv: vnYmd(data.ngay_ra_vien) || null,
  };
}

export async function upsertNkbvBaNgayKhoa(input: {
  ma_benh_an: string;
  ngay_lich: string;
  khoa_id: string | null;
}) {
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "create" },
    { moduleKey: "GIAM_SAT_NKBV", action: "edit" },
  ]);
  const parsed = nkbvBaNgayKhoaSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  const { ma_benh_an: ma, ngay_lich: date, khoa_id: khoaId } = parsed.data;

  const bounds = await stayBounds(ma);
  if (!bounds.ok) return { success: false as const, error: bounds.error };
  const { vv, rv } = bounds;
  const bound = isDeviceDateInStay(date, vv, rv);
  if (!bound.ok) return { success: false as const, error: bound.reason || "Ngoài đợt nằm viện" };

  const supabase = createAdminSupabaseClient();
  if (!khoaId) {
    const { error } = await supabase
      .from("nkbv_fact_ba_ngay_khoa")
      .delete()
      .eq("ma_benh_an", ma)
      .eq("ngay_lich", date);
    if (error) return { success: false as const, error: error.message };
    await syncNkbvPhieuFromBaNgay(ma);
    return { success: true as const, khoa_id: null as string | null };
  }

  const { error } = await supabase.from("nkbv_fact_ba_ngay_khoa").upsert(
    {
      ma_benh_an: ma,
      ngay_lich: date,
      khoa_id: khoaId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "ma_benh_an,ngay_lich" },
  );
  if (error) return { success: false as const, error: error.message };

  if (date === vv) {
    await supabase
      .from("nkbv_fact_benh_an")
      .update({ khoa_dieu_tri_id: khoaId, updated_at: new Date().toISOString() })
      .eq("ma_benh_an", ma);
  }
  await syncNkbvPhieuFromBaNgay(ma);
  return { success: true as const, khoa_id: khoaId };
}

export async function toggleNkbvBaNgayDungCu(input: {
  ma_benh_an: string;
  ngay_lich: string;
  criteria_key: string;
  on: boolean;
}) {
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "create" },
    { moduleKey: "GIAM_SAT_NKBV", action: "edit" },
  ]);
  const parsed = nkbvBaNgayDungCuSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  const { ma_benh_an: ma, ngay_lich: date } = parsed.data;
  const loai = criteriaKeyToDungCuLoai(parsed.data.criteria_key);
  if (!loai) return { success: false as const, error: "Loại dụng cụ không hợp lệ" };

  const bounds = await stayBounds(ma);
  if (!bounds.ok) return { success: false as const, error: bounds.error };
  const { vv, rv } = bounds;
  if (input.on) {
    const bound = isDeviceDateInStay(date, vv, rv);
    if (!bound.ok) return { success: false as const, error: bound.reason || "Ngoài đợt nằm viện" };
  }

  const supabase = createAdminSupabaseClient();
  if (!input.on) {
    const { error } = await supabase
      .from("nkbv_fact_ba_ngay_dung_cu")
      .delete()
      .eq("ma_benh_an", ma)
      .eq("ngay_lich", date)
      .eq("loai_dung_cu", loai);
    if (error) return { success: false as const, error: error.message };
    await syncNkbvPhieuFromBaNgay(ma);
    return { success: true as const, on: false, loai };
  }

  const { data, error } = await supabase
    .from("nkbv_fact_ba_ngay_dung_cu")
    .upsert(
      { ma_benh_an: ma, ngay_lich: date, loai_dung_cu: loai, updated_at: new Date().toISOString() },
      { onConflict: "ma_benh_an,ngay_lich,loai_dung_cu" },
    )
    .select("id, ngay_lich, loai_dung_cu")
    .single();
  if (error) return { success: false as const, error: error.message };
  await syncNkbvPhieuFromBaNgay(ma);
  return { success: true as const, on: true, loai, data };
}
