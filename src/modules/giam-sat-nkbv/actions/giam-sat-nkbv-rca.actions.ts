"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { GSC_BK_ISOLATION, GSC_BK_MDRO } from "../lib/nkbv-mdro";

export type NkbvPatientRcaRow = {
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  is_mdro: boolean;
  mdro_phenotype: string | null;
  nkbv_case_count: number;
  gsc_session_count: number;
  has_mdro_bk: boolean;
  has_isolation_bk: boolean;
  latest_gsc_ngay: string | null;
  latest_nkbv_ngay: string | null;
};

/**
 * Join nhẹ: BA còn nằm × MDRO × phiên GSC (30 ngày) × ca NKBV — nền phân tích lỗi.
 */
export async function listNkbvPatientRcaByKhoa(params: { khoaId: string; limit?: number }) {
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "view" },
    { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
  ]);

  const khoaId = String(params.khoaId || "").trim();
  if (!khoaId) return { success: false as const, error: "Thiếu khoa", data: [] as NkbvPatientRcaRow[] };

  const supabase = await createServerSupabaseUserClient();
  const limit = Math.min(Math.max(params.limit || 100, 1), 300);

  const { data: stays, error: stayErr } = await supabase
    .from("nkbv_fact_benh_an")
    .select("ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan")
    .eq("is_active", true)
    .is("ngay_ra_vien", null)
    .eq("khoa_dieu_tri_id", khoaId)
    .limit(limit);
  if (stayErr) return { success: false as const, error: stayErr.message, data: [] as NkbvPatientRcaRow[] };
  if (!stays?.length) return { success: true as const, data: [] as NkbvPatientRcaRow[] };

  const baList = stays.map((s) => String(s.ma_benh_an));
  const pidList = stays.map((s) => String(s.ma_benh_nhan)).filter(Boolean);

  const [{ data: mdroRows }, { data: cases }, { data: sessions }] = await Promise.all([
    supabase
      .from("nkbv_fact_vi_sinh")
      .select("ma_benh_an, mdro_phenotype")
      .eq("is_active", true)
      .eq("is_mdro", true)
      .in("ma_benh_an", baList),
    supabase
      .from("v_nkbv_su_kien_full")
      .select("ma_benh_an, ngay_phat_hien")
      .eq("is_active", true)
      .in("ma_benh_an", baList),
    supabase
      .from("v_gstt_giam_sat_chung_sessions_full")
      .select("ma_benh_an, ma_nguoi_benh, loai_bang_kiem, ngay_giam_sat")
      .eq("is_active", true)
      .eq("khoa_id", khoaId)
      .limit(3000),
  ]);

  const mdroByBa = new Map<string, string | null>();
  for (const r of mdroRows || []) {
    const ba = String(r.ma_benh_an || "");
    if (ba && !mdroByBa.has(ba)) mdroByBa.set(ba, r.mdro_phenotype ? String(r.mdro_phenotype) : null);
  }

  const data: NkbvPatientRcaRow[] = stays.map((s) => {
    const ba = String(s.ma_benh_an);
    const pid = String(s.ma_benh_nhan || "");
    const caseRows = (cases || []).filter((c) => String(c.ma_benh_an) === ba);
    const sess = (sessions || []).filter((x) => {
      const sBa = String(x.ma_benh_an || "").trim();
      const sPid = String(x.ma_nguoi_benh || "").trim();
      return (sBa && sBa === ba) || (sPid && sPid === pid);
    });
    const latestGsc = sess
      .map((x) => String(x.ngay_giam_sat || "").slice(0, 10))
      .filter(Boolean)
      .sort()
      .at(-1);
    const latestNkbv = caseRows
      .map((x) => String(x.ngay_phat_hien || "").slice(0, 10))
      .filter(Boolean)
      .sort()
      .at(-1);

    return {
      ma_benh_an: ba,
      ma_benh_nhan: pid,
      ho_ten_benh_nhan: String(s.ho_ten_benh_nhan || ""),
      is_mdro: mdroByBa.has(ba),
      mdro_phenotype: mdroByBa.get(ba) || null,
      nkbv_case_count: caseRows.length,
      gsc_session_count: sess.length,
      has_mdro_bk: sess.some((x) => String(x.loai_bang_kiem) === GSC_BK_MDRO),
      has_isolation_bk: sess.some((x) => String(x.loai_bang_kiem) === GSC_BK_ISOLATION),
      latest_gsc_ngay: latestGsc || null,
      latest_nkbv_ngay: latestNkbv || null,
    };
  });

  // Ưu tiên BN có tín hiệu (MDRO / ca / phiên)
  data.sort((a, b) => {
    const score = (r: NkbvPatientRcaRow) =>
      (r.is_mdro ? 4 : 0) +
      (r.nkbv_case_count > 0 ? 2 : 0) +
      (r.gsc_session_count > 0 ? 1 : 0) -
      (r.has_mdro_bk ? 0 : r.is_mdro ? 1 : 0);
    return score(b) - score(a);
  });

  void pidList;
  return { success: true as const, data };
}
