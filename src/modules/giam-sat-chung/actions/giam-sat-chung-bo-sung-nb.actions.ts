"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import {
  normalizeMdroPhenotype,
  type NkbvMdroPhenotype,
} from "@/modules/giam-sat-nkbv/lib/nkbv-mdro";
import type { GscBoSungNbFields } from "../lib/gsc-bo-sung-nguoi-benh";
import { EMPTY_GSC_BO_SUNG_NB } from "../lib/gsc-bo-sung-nguoi-benh";

/**
 * Gợi ý can thiệp / MDRO từ hồ sơ NKBV khi chọn BA trên khung bổ sung NB (GSC).
 * Chỉ đọc — không ghi registry.
 */
export async function getGscBoSungPatientHints(maBenhAn: string) {
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
    { moduleKey: "GIAM_SAT_NKBV", action: "view" },
  ]);

  const ma = String(maBenhAn || "").trim();
  if (!ma) {
    return { success: true as const, data: { ...EMPTY_GSC_BO_SUNG_NB } };
  }

  const supabase = await createServerSupabaseUserClient();
  const today = new Date().toISOString().slice(0, 10);

  const [devRes, tlRes, stayRes, mdroRes] = await Promise.all([
    supabase
      .from("nkbv_fact_ba_ngay_dung_cu")
      .select("loai_dung_cu, ngay_lich")
      .eq("ma_benh_an", ma),
    supabase
      .from("nkbv_fact_ba_timeline")
      .select("id")
      .eq("ma_benh_an", ma)
      .eq("is_active", true)
      .eq("milestone_kind", "PROCEDURE_SURGERY")
      .limit(1),
    supabase
      .from("nkbv_fact_benh_an")
      .select("ma_benh_nhan")
      .eq("ma_benh_an", ma)
      .maybeSingle(),
    supabase
      .from("nkbv_fact_vi_sinh")
      .select("is_mdro, mdro_phenotype, ngay_lay_mau")
      .eq("ma_benh_an", ma)
      .eq("is_active", true)
      .eq("is_mdro", true)
      .order("ngay_lay_mau", { ascending: false })
      .limit(1),
  ]);

  let hasSurgery = Boolean((tlRes.data || []).length);
  const pid = String(stayRes.data?.ma_benh_nhan || "").trim();
  if (!hasSurgery && pid) {
    const { data: pts } = await supabase
      .from("nkbv_fact_mau_so_phau_thuat")
      .select("id")
      .eq("ma_benh_nhan", pid)
      .eq("is_active", true)
      .limit(1);
    hasSurgery = Boolean((pts || []).length);
  }

  const activeDevices = (devRes.data || []).filter((d) => {
    const ngay = d.ngay_lich ? String(d.ngay_lich).slice(0, 10) : "";
    return ngay >= today;
  });
  const types = new Set(activeDevices.map((d) => String(d.loai_dung_cu || "")));

  const mdroRow = (mdroRes.data || [])[0];
  const phenotype = normalizeMdroPhenotype(mdroRow?.mdro_phenotype ?? null);
  const isMdro = Boolean(mdroRow?.is_mdro);

  const data: GscBoSungNbFields = {
    ...EMPTY_GSC_BO_SUNG_NB,
    bn_tho_may: types.has("VENT"),
    bn_phau_thuat: hasSurgery,
    bn_cvc: types.has("CVC"),
    bn_foley: types.has("FOLEY"),
    bn_nhiem_mdro: isMdro,
    bn_mdro_phenotype: (phenotype || "") as NkbvMdroPhenotype | "",
    bn_nhiem_tac_nhan_nguy_hiem: false,
    bn_tac_nhan_nguy_hiem_ten: "",
  };

  return { success: true as const, data };
}
