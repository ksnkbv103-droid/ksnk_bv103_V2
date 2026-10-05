"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import { fetchAllByIdChunks, fetchAllRangeRows } from "@/lib/fetch-all-range";
import { actionDisplayLabel, momentDisplayLabel } from "../lib/vst-constants";

export type VstExportRow = {
  session_id: string;
  ngay_giam_sat: string | null;
  khoa: string | null;
  ten_khu_vuc: string | null;
  vi_tri: string | null;
  hinh_thuc_giam_sat: string | null;
  ten_nguoi_giam_sat: string | null;
  thoi_gian_bat_dau: string | null;
  thoi_gian_ket_thuc: string | null;
  ten_doi_tuong: string | null;
  ngoai_danh_muc: string | null;
  ten_nghe_nghiep: string | null;
  thoi_diem: string | null;
  hanh_dong: string | null;
  dung_ky_thuat: string | null;
  du_thoi_gian: string | null;
  co_deo_gang: string | null;
  thoi_gian_ghi_nhan: string | null;
};

function boolVi(v: unknown): string | null {
  if (typeof v !== "boolean") return null;
  return v ? "Có" : "Không";
}

function mapMomentsDisplay(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .split(/\s*,\s*/g)
    .map((p) => momentDisplayLabel(p.trim()))
    .filter(Boolean)
    .join(", ");
}

/**
 * Xuất cơ hội VST thô theo kỳ + scope. Đọc hết trang; lỗi đọc trả success: false.
 */
export async function exportVstOpportunitiesRaw(params: {
  tu_ngay: string;
  den_ngay: string;
}): Promise<{ success: true; rows: VstExportRow[] } | { success: false; error: string }> {
  try {
    await verifyPermission("GIAM_SAT_VST", "view");
    const scope = await getActorKsnkScope();
    const supabase = createAdminSupabaseClient();
    const scopeKhoa =
      scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk ? scope.actorKhoaId : null;
    if (scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk && !scopeKhoa) {
      return { success: true, rows: [] };
    }

    const sessionList = await fetchAllRangeRows<Record<string, unknown>>((from, to) => {
      let sessionQ = supabase
        .from("v_gstt_giam_sat_vst_sessions_full")
        .select(
          "id, ngay_giam_sat, ma_khoa_phong, ten_khoa_phong, ten_khu_vuc_giam_sat, ten_nguoi_giam_sat, khoa_id, hinh_thuc_giam_sat, vi_tri_cu_the, thoi_gian_bat_dau, thoi_gian_ket_thuc",
        )
        .eq("is_active", true)
        .gte("ngay_giam_sat", params.tu_ngay)
        .lte("ngay_giam_sat", params.den_ngay);
      if (scopeKhoa) sessionQ = sessionQ.eq("khoa_id", scopeKhoa);
      return sessionQ
        .order("ngay_giam_sat", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);
    });
    if (sessionList.length === 0) return { success: true, rows: [] };

    const sessionIds = sessionList.map((s) => String(s.id));
    const sessionMap = new Map(sessionList.map((s) => [String(s.id), s]));

    const facts = await fetchAllByIdChunks<Record<string, unknown>>(sessionIds, (idChunk, from, to) =>
      supabase
        .from("v_gstt_giam_sat_vst_full")
        .select(
          "id, session_id, ten_nhan_vien, ten_nhan_vien_ngoai, ten_nghe_nghiep_hien_thi, thoi_diem, hanh_dong, dung_ky_thuat, du_thoi_gian, co_deo_gang, ngay_giam_sat, thoi_gian_ghi_nhan, vi_tri",
        )
        .in("session_id", idChunk)
        .order("id", { ascending: true })
        .range(from, to),
    );

    const rows: VstExportRow[] = facts.map((f) => {
      const sid = String(f.session_id ?? "");
      const s = sessionMap.get(sid) ?? {};
      const tenDoiTuong =
        f.ten_nhan_vien != null
          ? String(f.ten_nhan_vien)
          : f.ten_nhan_vien_ngoai != null
            ? String(f.ten_nhan_vien_ngoai)
            : null;
      const ngoai = f.ten_nhan_vien_ngoai != null && String(f.ten_nhan_vien_ngoai).trim() !== "";
      return {
        session_id: sid,
        ngay_giam_sat:
          f.ngay_giam_sat != null
            ? String(f.ngay_giam_sat)
            : s.ngay_giam_sat != null
              ? String(s.ngay_giam_sat)
              : null,
        khoa: (() => {
          const label = formatKhoaCompactLabel({
            ma_khoa: s.ma_khoa_phong != null ? String(s.ma_khoa_phong) : null,
            ten_khoa: s.ten_khoa_phong != null ? String(s.ten_khoa_phong) : null,
          });
          return label === "—" ? null : label;
        })(),
        ten_khu_vuc: s.ten_khu_vuc_giam_sat != null ? String(s.ten_khu_vuc_giam_sat) : null,
        vi_tri:
          f.vi_tri != null
            ? String(f.vi_tri)
            : s.vi_tri_cu_the != null
              ? String(s.vi_tri_cu_the)
              : null,
        hinh_thuc_giam_sat: s.hinh_thuc_giam_sat != null ? String(s.hinh_thuc_giam_sat) : null,
        ten_nguoi_giam_sat: s.ten_nguoi_giam_sat != null ? String(s.ten_nguoi_giam_sat) : null,
        thoi_gian_bat_dau: s.thoi_gian_bat_dau != null ? String(s.thoi_gian_bat_dau) : null,
        thoi_gian_ket_thuc: s.thoi_gian_ket_thuc != null ? String(s.thoi_gian_ket_thuc) : null,
        ten_doi_tuong: tenDoiTuong,
        ngoai_danh_muc: ngoai ? "Có" : "Không",
        ten_nghe_nghiep: f.ten_nghe_nghiep_hien_thi != null ? String(f.ten_nghe_nghiep_hien_thi) : null,
        thoi_diem: mapMomentsDisplay(f.thoi_diem != null ? String(f.thoi_diem) : null),
        hanh_dong: f.hanh_dong != null ? actionDisplayLabel(String(f.hanh_dong)) : null,
        dung_ky_thuat: boolVi(f.dung_ky_thuat),
        du_thoi_gian: boolVi(f.du_thoi_gian),
        co_deo_gang: boolVi(f.co_deo_gang),
        thoi_gian_ghi_nhan: f.thoi_gian_ghi_nhan != null ? String(f.thoi_gian_ghi_nhan) : null,
      };
    });

    return { success: true, rows };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không xuất được VST" };
  }
}
