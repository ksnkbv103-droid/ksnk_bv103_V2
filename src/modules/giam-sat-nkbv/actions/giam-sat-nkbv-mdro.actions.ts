"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import {
  buildGscMdroDeepLink,
  GSC_BK_ISOLATION,
  GSC_BK_MDRO,
  NKBV_MDRO_PHENOTYPE_LABELS,
  type NkbvMdroPhenotype,
} from "../lib/nkbv-mdro";

export type MdroInpatientRow = {
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  khoa_dieu_tri_id: string | null;
  ngay_vao_vien: string | null;
  mdro_phenotype: NkbvMdroPhenotype | null;
  mdro_phenotype_label: string;
  ngay_mau_mdro: string | null;
  has_mdro_supervision: boolean;
  has_isolation_checklist: boolean;
  link_mdro: string;
  link_isolation: string;
};

async function assertCensusRead() {
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "view" },
    { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
  ]);
}

/**
 * BN còn nằm viện có ≥1 kết quả vi sinh is_mdro trong đợt nằm viện,
 * kèm trạng thái đã GS BM.31.03 / cách ly BM.14.01 (theo ma_benh_an hoặc PID).
 */
export async function listMdroInpatientsByKhoa(params: {
  khoaId?: string | null;
  limit?: number;
}) {
  await assertCensusRead();
  const supabase = await createServerSupabaseUserClient();
  const khoaId = params.khoaId ? String(params.khoaId).trim() : "";
  const limit = Math.min(Math.max(params.limit || 200, 1), 500);

  let stayQ = supabase
    .from("nkbv_fact_benh_an")
    .select("ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_vao_vien, khoa_dieu_tri_id")
    .eq("is_active", true)
    .is("ngay_ra_vien", null)
    .order("ho_ten_benh_nhan", { ascending: true })
    .limit(limit);
  if (khoaId) stayQ = stayQ.eq("khoa_dieu_tri_id", khoaId);

  const { data: stays, error: stayErr } = await stayQ;
  if (stayErr) return { success: false as const, error: stayErr.message, data: [] as MdroInpatientRow[] };
  if (!stays?.length) return { success: true as const, data: [] as MdroInpatientRow[] };

  const baList = stays.map((s) => String(s.ma_benh_an));
  const { data: mdroRows, error: mdroErr } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select("ma_benh_an, mdro_phenotype, ngay_lay_mau")
    .eq("is_active", true)
    .eq("is_mdro", true)
    .in("ma_benh_an", baList)
    .order("ngay_lay_mau", { ascending: false });
  if (mdroErr) return { success: false as const, error: mdroErr.message, data: [] as MdroInpatientRow[] };

  const latestByBa = new Map<string, { phenotype: string | null; ngay: string | null }>();
  for (const r of mdroRows || []) {
    const ba = String(r.ma_benh_an || "");
    if (!ba || latestByBa.has(ba)) continue;
    latestByBa.set(ba, {
      phenotype: r.mdro_phenotype ? String(r.mdro_phenotype) : null,
      ngay: r.ngay_lay_mau ? String(r.ngay_lay_mau).slice(0, 10) : null,
    });
  }

  const mdroStays = stays.filter((s) => latestByBa.has(String(s.ma_benh_an)));
  if (!mdroStays.length) return { success: true as const, data: [] as MdroInpatientRow[] };

  const baKeys = mdroStays.map((s) => String(s.ma_benh_an));
  const pidKeys = mdroStays.map((s) => String(s.ma_benh_nhan)).filter(Boolean);

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: sessions } = await supabase
    .from("v_gstt_giam_sat_chung_sessions_full")
    .select("ma_benh_an, ma_nguoi_benh, loai_bang_kiem, ngay_giam_sat")
    .eq("is_active", true)
    .gte("ngay_giam_sat", sinceIso)
    .in("loai_bang_kiem", [GSC_BK_MDRO, GSC_BK_ISOLATION])
    .limit(2000);

  const hasBk = (ba: string, pid: string, bk: string) =>
    (sessions || []).some((s) => {
      if (String(s.loai_bang_kiem || "") !== bk) return false;
      const sBa = String(s.ma_benh_an || "").trim();
      const sPid = String(s.ma_nguoi_benh || "").trim();
      return (sBa && sBa === ba) || (sPid && sPid === pid);
    });

  const data: MdroInpatientRow[] = mdroStays.map((s) => {
    const ba = String(s.ma_benh_an);
    const pid = String(s.ma_benh_nhan || "");
    const latest = latestByBa.get(ba)!;
    const ph = (latest.phenotype || null) as NkbvMdroPhenotype | null;
    const khoa = s.khoa_dieu_tri_id ? String(s.khoa_dieu_tri_id) : null;
    return {
      ma_benh_an: ba,
      ma_benh_nhan: pid,
      ho_ten_benh_nhan: String(s.ho_ten_benh_nhan || ""),
      khoa_dieu_tri_id: khoa,
      ngay_vao_vien: s.ngay_vao_vien ? String(s.ngay_vao_vien) : null,
      mdro_phenotype: ph,
      mdro_phenotype_label: ph ? NKBV_MDRO_PHENOTYPE_LABELS[ph] || ph : "—",
      ngay_mau_mdro: latest.ngay,
      has_mdro_supervision: hasBk(ba, pid, GSC_BK_MDRO),
      has_isolation_checklist: hasBk(ba, pid, GSC_BK_ISOLATION),
      link_mdro: buildGscMdroDeepLink({
        bangKiemMa: GSC_BK_MDRO,
        khoaId: khoa,
        maBenhAn: ba,
        maBenhNhan: pid,
        tenBenhNhan: String(s.ho_ten_benh_nhan || ""),
      }),
      link_isolation: buildGscMdroDeepLink({
        bangKiemMa: GSC_BK_ISOLATION,
        khoaId: khoa,
        maBenhAn: ba,
        maBenhNhan: pid,
        tenBenhNhan: String(s.ho_ten_benh_nhan || ""),
      }),
    };
  });

  return { success: true as const, data };
}

/** Trạng thái MDRO + GS/cách ly cho một BA (dùng sau khi chọn BN trên GSC). */
export async function getPatientMdroSupervisionStatus(params: {
  maBenhAn?: string | null;
  maBenhNhan?: string | null;
  khoaId?: string | null;
}) {
  await assertCensusRead();
  const ba = String(params.maBenhAn || "").trim();
  const pid = String(params.maBenhNhan || "").trim();
  if (!ba && !pid) {
    return {
      success: true as const,
      data: {
        is_mdro: false,
        mdro_phenotype: null as NkbvMdroPhenotype | null,
        has_mdro_supervision: false,
        has_isolation_checklist: false,
        link_mdro: "",
        link_isolation: "",
      },
    };
  }

  const list = await listMdroInpatientsByKhoa({
    khoaId: params.khoaId || null,
    limit: 500,
  });
  if (!list.success) return { success: false as const, error: list.error };

  const hit = list.data.find(
    (r) => (ba && r.ma_benh_an === ba) || (pid && r.ma_benh_nhan === pid),
  );
  if (!hit) {
    return {
      success: true as const,
      data: {
        is_mdro: false,
        mdro_phenotype: null as NkbvMdroPhenotype | null,
        has_mdro_supervision: false,
        has_isolation_checklist: false,
        link_mdro: buildGscMdroDeepLink({
          bangKiemMa: GSC_BK_MDRO,
          khoaId: params.khoaId,
          maBenhAn: ba || null,
          maBenhNhan: pid || null,
        }),
        link_isolation: buildGscMdroDeepLink({
          bangKiemMa: GSC_BK_ISOLATION,
          khoaId: params.khoaId,
          maBenhAn: ba || null,
          maBenhNhan: pid || null,
        }),
      },
    };
  }

  return {
    success: true as const,
    data: {
      is_mdro: true,
      mdro_phenotype: hit.mdro_phenotype,
      has_mdro_supervision: hit.has_mdro_supervision,
      has_isolation_checklist: hit.has_isolation_checklist,
      link_mdro: hit.link_mdro,
      link_isolation: hit.link_isolation,
    },
  };
}
