"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { isDeviceDateInStay } from "../lib/nkbv-ba-device-timeline";
import {
  criteriaKeyToDungCuLoai,
  eventDateFromVerification,
  khoaIdByDateMap,
  khoaIdOnOrBefore,
  stripCopiedStayFieldsFromVerification,
} from "../lib/nkbv-ba-ngay";

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
    vv: data.ngay_vao_vien ? String(data.ngay_vao_vien).slice(0, 10) : "",
    rv: data.ngay_ra_vien ? String(data.ngay_ra_vien).slice(0, 10) : null,
  };
}

/** Đổi lưới → cập nhật khoa quy kết trên phiếu; không đổi loại nhiễm. */
export async function syncNkbvPhieuFromBaNgay(maBenhAn: string) {
  const ma = String(maBenhAn || "").trim();
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };
  const supabase = createAdminSupabaseClient();
  const [{ data: khoaRows }, { data: cases }] = await Promise.all([
    supabase.from("nkbv_fact_ba_ngay_khoa").select("ngay_lich, khoa_id").eq("ma_benh_an", ma),
    supabase
      .from("nkbv_fact_su_kien")
      .select("id, ngay_phat_hien, verification_data, khoa_ghi_nhan_id")
      .eq("ma_benh_an", ma)
      .eq("is_active", true),
  ]);
  const byDate = khoaIdByDateMap(
    (khoaRows || []).map((r) => ({
      ngay_lich: String(r.ngay_lich).slice(0, 10),
      khoa_id: String(r.khoa_id),
    })),
  );
  for (const c of cases || []) {
    const vd =
      c.verification_data && typeof c.verification_data === "object"
        ? (c.verification_data as Record<string, unknown>)
        : {};
    const doe = eventDateFromVerification(vd, c.ngay_phat_hien ? String(c.ngay_phat_hien).slice(0, 10) : null);
    const khoaId = doe ? khoaIdOnOrBefore(byDate, doe) : null;
    const nextVd = stripCopiedStayFieldsFromVerification(vd);
    const patch: Record<string, unknown> = { verification_data: nextVd };
    if (khoaId && khoaId !== String(c.khoa_ghi_nhan_id || "")) {
      patch.khoa_ghi_nhan_id = khoaId;
    }
    await supabase.from("nkbv_fact_su_kien").update(patch).eq("id", c.id);
  }
  return { success: true as const };
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
  const ma = String(input.ma_benh_an || "").trim();
  const date = String(input.ngay_lich || "").slice(0, 10);
  const khoaId = input.khoa_id ? String(input.khoa_id).trim() : "";
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false as const, error: "Ngày không hợp lệ" };

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
  const ma = String(input.ma_benh_an || "").trim();
  const date = String(input.ngay_lich || "").slice(0, 10);
  const loai = criteriaKeyToDungCuLoai(input.criteria_key);
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!loai) return { success: false as const, error: "Loại dụng cụ không hợp lệ" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false as const, error: "Ngày không hợp lệ" };

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
