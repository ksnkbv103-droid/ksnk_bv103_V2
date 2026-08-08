"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { GSC_SESSIONS_FULL_LIST_SELECT } from "../lib/gsc-read-view-select";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

export type GscExportRow = {
  id: string;
  ngay_giam_sat: string | null;
  /** Mã khoa (compact); thiếu mã → tên */
  khoa: string | null;
  ten_khu_vuc: string | null;
  ten_bang_kiem: string | null;
  loai_bang_kiem: string | null;
  ten_nguoi_giam_sat: string | null;
  ten_nhan_vien: string | null;
  ten_nghe_nghiep: string | null;
  tong_diem: number | null;
  tong_dat: number | null;
  tong_quan_sat: number | null;
  hinh_thuc: string | null;
  cach_thuc: string | null;
};

/**
 * Xuất dữ liệu thô phiên GSC (tối đa 5000 dòng) theo kỳ + scope mạng lưới.
 * Gate bằng VIEW (không bắt buộc EXPORT trên role seed).
 */
export async function exportGscSessionsRaw(params: {
  tu_ngay: string;
  den_ngay: string;
}): Promise<{ success: true; rows: GscExportRow[] } | { success: false; error: string }> {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();
    const supabase = createAdminSupabaseClient();

    let q = supabase
      .from("v_gstt_giam_sat_chung_sessions_full")
      .select(GSC_SESSIONS_FULL_LIST_SELECT)
      .eq("is_active", true)
      .gte("ngay_giam_sat", params.tu_ngay)
      .lte("ngay_giam_sat", params.den_ngay)
      .order("ngay_giam_sat", { ascending: false })
      .limit(5000);

    if (scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk) {
      if (!scope.actorKhoaId) return { success: true, rows: [] };
      q = q.eq("khoa_id", scope.actorKhoaId);
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows: GscExportRow[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? ""),
      ngay_giam_sat: r.ngay_giam_sat != null ? String(r.ngay_giam_sat) : null,
      khoa: (() => {
        const label = formatKhoaCompactLabel({
          ma_khoa: r.ma_khoa_phong != null ? String(r.ma_khoa_phong) : null,
          ten_khoa: r.ten_khoa_phong != null ? String(r.ten_khoa_phong) : null,
        });
        return label === "—" ? null : label;
      })(),
      ten_khu_vuc: r.ten_khu_vuc_giam_sat != null ? String(r.ten_khu_vuc_giam_sat) : null,
      ten_bang_kiem: r.ten_bang_kiem_hien_thi != null ? String(r.ten_bang_kiem_hien_thi) : null,
      loai_bang_kiem: r.loai_bang_kiem != null ? String(r.loai_bang_kiem) : null,
      ten_nguoi_giam_sat: r.ten_nguoi_giam_sat != null ? String(r.ten_nguoi_giam_sat) : null,
      ten_nhan_vien: r.ten_nhan_vien != null ? String(r.ten_nhan_vien) : null,
      ten_nghe_nghiep: r.ten_nghe_nghiep != null ? String(r.ten_nghe_nghiep) : null,
      tong_diem: r.tong_diem != null ? Number(r.tong_diem) : null,
      tong_dat: r.tong_dat != null ? Number(r.tong_dat) : null,
      tong_quan_sat: r.tong_quan_sat != null ? Number(r.tong_quan_sat) : null,
      hinh_thuc: r.ten_hinh_thuc_danh_muc != null ? String(r.ten_hinh_thuc_danh_muc) : null,
      cach_thuc: r.ten_cach_thuc_danh_muc != null ? String(r.ten_cach_thuc_danh_muc) : null,
    }));

    return { success: true, rows };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không xuất được GSC" };
  }
}
