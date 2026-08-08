"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { missingMauSoDays } from "../lib/nkbv-mau-so-daily-rules";

type DailyPayload = {
  id?: string;
  khoa_id: string;
  ngay_ghi_nhan: string;
  so_ngay_tho_may: number;
  so_ngay_catheter_cvc: number;
  so_ngay_sonde_tieu: number;
  so_ngay_dieu_tri: number;
  so_dot_tho_may_emv: number;
  metadata?: Record<string, any>;
};

type SurgeryPayload = {
  id?: string;
  khoa_id: string;
  ngay_phau_thuat: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ten_phau_thuat: string;
  loai_phau_thuat_nhsn: string;
  phan_loai_vet_mo: "SACH" | "SACH_NHIEM" | "NHIEM" | "BAN";
  co_dat_implant: boolean;
  asa_score?: number;
  thoi_gian_mo_phut: number;
  thoi_gian_nguong_nhsn?: number;
  is_laparoscopic: boolean;
  expected_ssi_prob?: number;
  metadata?: Record<string, any>;
};

function bedCapacityFromSpecs(specs: unknown): number | null {
  if (!specs || typeof specs !== "object") return null;
  const s = specs as Record<string, unknown>;
  const thuong = Number(s.so_giuong_benh_thuong ?? 0) || 0;
  const capCuu = Number(s.so_giuong_cap_cuu ?? 0) || 0;
  const total = thuong + capCuu;
  return total > 0 ? total : null;
}

/** Phủ ngày mẫu số theo khoa × tháng + sức chứa giường MDM (soft-warn census). */
export async function getNkbvMauSoMonthCoverage(input: {
  khoa_id: string;
  year: number;
  month: number;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const supabase = createAdminSupabaseClient();
  const { khoa_id, year, month } = input;
  if (!khoa_id || month < 1 || month > 12) {
    return { success: false as const, error: "Thiếu khoa hoặc tháng không hợp lệ" };
  }

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    const [{ data: rows, error }, khoaRes] = await Promise.all([
      supabase
        .from("nkbv_fact_mau_so_daily")
        .select("ngay_ghi_nhan, so_ngay_dieu_tri, so_ngay_catheter_cvc, so_ngay_sonde_tieu, so_ngay_tho_may")
        .eq("khoa_id", khoa_id)
        .gte("ngay_ghi_nhan", from)
        .lte("ngay_ghi_nhan", to)
        .order("ngay_ghi_nhan", { ascending: true }),
      supabase.from("mdm_dm_khoa_phong").select("specs").eq("id", khoa_id).maybeSingle(),
    ]);
    if (error) throw error;

    const submitted = (rows || []).map((r) => String(r.ngay_ghi_nhan).slice(0, 10));
    const missing = missingMauSoDays(year, month, submitted);
    const bed_capacity = bedCapacityFromSpecs(khoaRes.data?.specs ?? null);

    return {
      success: true as const,
      data: {
        year,
        month,
        from,
        to,
        submitted_dates: submitted,
        missing_dates: missing,
        submitted_count: submitted.length,
        missing_count: missing.length,
        bed_capacity,
        rows: (rows || []).map((r) => ({
          ngay_ghi_nhan: String(r.ngay_ghi_nhan).slice(0, 10),
          so_ngay_dieu_tri: Number(r.so_ngay_dieu_tri) || 0,
          so_ngay_catheter_cvc: Number(r.so_ngay_catheter_cvc) || 0,
          so_ngay_sonde_tieu: Number(r.so_ngay_sonde_tieu) || 0,
          so_ngay_tho_may: Number(r.so_ngay_tho_may) || 0,
        })),
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg || "Không tải được phủ ngày mẫu số" };
  }
}

/** Ghi nhận số liệu mẫu số ngày-thiết bị hàng ngày (Hồi sức, tích cực...). */
export async function saveNkbvMauSoDaily(payload: DailyPayload) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  try {
    const row = {
      khoa_id: payload.khoa_id,
      ngay_ghi_nhan: payload.ngay_ghi_nhan.slice(0, 10),
      so_ngay_tho_may: Math.max(0, payload.so_ngay_tho_may),
      so_ngay_catheter_cvc: Math.max(0, payload.so_ngay_catheter_cvc),
      so_ngay_sonde_tieu: Math.max(0, payload.so_ngay_sonde_tieu),
      so_ngay_dieu_tri: Math.max(0, payload.so_ngay_dieu_tri),
      so_dot_tho_may_emv: Math.max(0, payload.so_dot_tho_may_emv),
      nguoi_bao_cao_id: actorNhanSuId || null,
      updated_at: new Date().toISOString(),
      metadata: payload.metadata ?? {}
    };

    let result;
    if (payload.id) {
      // Cập nhật theo ID
      const { data, error } = await supabase
        .from("nkbv_fact_mau_so_daily")
        .update(row)
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Upsert theo (khoa_id, ngay_ghi_nhan)
      const { data, error } = await supabase
        .from("nkbv_fact_mau_so_daily")
        .upsert(
          { ...row, created_at: new Date().toISOString() },
          { onConflict: "khoa_id, ngay_ghi_nhan" }
        )
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data: result };
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi lưu mẫu số ngày-thiết bị" };
  }
}

/** Ghi nhận mẫu số ca phẫu thuật phục vụ SSI. */
export async function saveNkbvMauSoPhauThuat(payload: SurgeryPayload) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  const supabase = createAdminSupabaseClient();

  try {
    // Tự động tính ssi probability nếu chưa có dựa trên logistic logic đơn giản
    // expected ssi prob = base prob + penalty
    let calculatedProb = payload.expected_ssi_prob;
    if (calculatedProb === undefined || calculatedProb === null) {
      calculatedProb = 0.01500; // base probability
      // 1. Phân loại vết mổ
      if (payload.phan_loai_vet_mo === "SACH_NHIEM") calculatedProb += 0.01000;
      else if (payload.phan_loai_vet_mo === "NHIEM") calculatedProb += 0.02500;
      else if (payload.phan_loai_vet_mo === "BAN") calculatedProb += 0.04000;

      // 2. Điểm ASA >= 3
      if (payload.asa_score && payload.asa_score >= 3) calculatedProb += 0.01000;

      // 3. Thời gian mổ vượt ngưỡng
      const threshold = payload.thoi_gian_nguong_nhsn ?? 120;
      if (payload.thoi_gian_mo_phut > threshold) calculatedProb += 0.00800;

      // 4. Implant
      if (payload.co_dat_implant) calculatedProb += 0.00500;

      // 5. Nội soi (Laparoscopic) làm giảm xác suất nhiễm khuẩn
      if (payload.is_laparoscopic) calculatedProb = Math.max(0.00500, calculatedProb - 0.00500);

      calculatedProb = parseFloat(calculatedProb.toFixed(5));
    }

    const row = {
      khoa_id: payload.khoa_id,
      ngay_phau_thuat: payload.ngay_phau_thuat.slice(0, 10),
      ma_benh_nhan: payload.ma_benh_nhan,
      ho_ten_benh_nhan: payload.ho_ten_benh_nhan,
      ten_phau_thuat: payload.ten_phau_thuat,
      loai_phau_thuat_nhsn: payload.loai_phau_thuat_nhsn,
      phan_loai_vet_mo: payload.phan_loai_vet_mo,
      co_dat_implant: payload.co_dat_implant,
      asa_score: payload.asa_score ?? null,
      thoi_gian_mo_phut: payload.thoi_gian_mo_phut,
      thoi_gian_nguong_nhsn: payload.thoi_gian_nguong_nhsn ?? 120,
      is_laparoscopic: payload.is_laparoscopic,
      expected_ssi_prob: calculatedProb,
      is_active: true,
      updated_at: new Date().toISOString(),
      metadata: payload.metadata ?? {}
    };

    let result;
    if (payload.id) {
      const { data, error } = await supabase
        .from("nkbv_fact_mau_so_phau_thuat")
        .update(row)
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("nkbv_fact_mau_so_phau_thuat")
        .insert({ ...row, created_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data: result };
  } catch (e: any) {
    return { success: false as const, error: e.message || "Lỗi lưu thông số phẫu thuật" };
  }
}
