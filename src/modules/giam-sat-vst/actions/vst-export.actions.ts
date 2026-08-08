"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

export type VstExportRow = {
  session_id: string;
  ngay_giam_sat: string | null;
  /** Mã khoa (compact); thiếu mã → tên */
  khoa: string | null;
  ten_khu_vuc: string | null;
  ten_nguoi_giam_sat: string | null;
  ten_doi_tuong: string | null;
  ten_nghe_nghiep: string | null;
  thoi_diem: string | null;
  hanh_dong: string | null;
  dung_ky_thuat: boolean | null;
  du_thoi_gian: boolean | null;
};

/**
 * Xuất cơ hội VST thô (tối đa 8000 dòng) theo kỳ + scope.
 */
export async function exportVstOpportunitiesRaw(params: {
  tu_ngay: string;
  den_ngay: string;
}): Promise<{ success: true; rows: VstExportRow[] } | { success: false; error: string }> {
  try {
    await verifyPermission("GIAM_SAT_VST", "view");
    const scope = await getActorKsnkScope();
    const supabase = createAdminSupabaseClient();

    let sessionQ = supabase
      .from("v_gstt_giam_sat_vst_sessions_full")
      .select("id, ngay_giam_sat, ma_khoa_phong, ten_khoa_phong, ten_khu_vuc_giam_sat, ten_nguoi_giam_sat, khoa_id")
      .eq("is_active", true)
      .gte("ngay_giam_sat", params.tu_ngay)
      .lte("ngay_giam_sat", params.den_ngay)
      .order("ngay_giam_sat", { ascending: false })
      .limit(2000);

    if (scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk) {
      if (!scope.actorKhoaId) return { success: true, rows: [] };
      sessionQ = sessionQ.eq("khoa_id", scope.actorKhoaId);
    }

    const { data: sessions, error: sErr } = await sessionQ;
    if (sErr) throw sErr;
    const sessionList = (sessions ?? []) as Record<string, unknown>[];
    if (sessionList.length === 0) return { success: true, rows: [] };

    const sessionIds = sessionList.map((s) => String(s.id));
    const sessionMap = new Map(sessionList.map((s) => [String(s.id), s]));

    const { data: facts, error: fErr } = await supabase
      .from("v_gstt_giam_sat_vst_full")
      .select(
        "session_id, ten_nhan_vien_ngoai, ten_nghe_nghiep_hien_thi, thoi_diem, hanh_dong, dung_ky_thuat, du_thoi_gian, ngay_giam_sat",
      )
      .in("session_id", sessionIds)
      .limit(8000);

    if (fErr) throw fErr;

    const rows: VstExportRow[] = ((facts ?? []) as Record<string, unknown>[]).map((f) => {
      const sid = String(f.session_id ?? "");
      const s = sessionMap.get(sid) ?? {};
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
        ten_nguoi_giam_sat: s.ten_nguoi_giam_sat != null ? String(s.ten_nguoi_giam_sat) : null,
        ten_doi_tuong: f.ten_nhan_vien_ngoai != null ? String(f.ten_nhan_vien_ngoai) : null,
        ten_nghe_nghiep: f.ten_nghe_nghiep_hien_thi != null ? String(f.ten_nghe_nghiep_hien_thi) : null,
        thoi_diem: f.thoi_diem != null ? String(f.thoi_diem) : null,
        hanh_dong: f.hanh_dong != null ? String(f.hanh_dong) : null,
        dung_ky_thuat: typeof f.dung_ky_thuat === "boolean" ? f.dung_ky_thuat : null,
        du_thoi_gian: typeof f.du_thoi_gian === "boolean" ? f.du_thoi_gian : null,
      };
    });

    return { success: true, rows };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không xuất được VST" };
  }
}
