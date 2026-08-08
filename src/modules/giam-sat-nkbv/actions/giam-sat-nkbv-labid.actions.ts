"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { addDays } from "../lib/nkbv-shared-timeline";
import { normalizeMdroPhenotype } from "../lib/nkbv-mdro";
import {
  evaluateLabidEvent,
  inferSpecimenClassFromBenhPham,
} from "../lib/nkbv-labid-engine";

export type LabidEventRecord = {
  id: string;
  ma_benh_an: string;
  event_type: string;
  phenotype: string;
  organism_category: string;
  specimen_class: string;
  collection_date: string;
  is_event: boolean;
  reason: string | null;
  vi_sinh_id: string | null;
};

export async function listNkbvLabidEvents(maBenhAn: string) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const ma = String(maBenhAn || "").trim();
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án", data: [] as LabidEventRecord[] };
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("nkbv_fact_labid_event")
    .select(
      "id, ma_benh_an, event_type, phenotype, organism_category, specimen_class, collection_date, is_event, reason, vi_sinh_id",
    )
    .eq("ma_benh_an", ma)
    .eq("is_active", true)
    .order("collection_date", { ascending: false })
    .limit(100);
  if (error) return { success: false as const, error: error.message, data: [] as LabidEventRecord[] };
  return { success: true as const, data: (data || []) as LabidEventRecord[] };
}

/**
 * Tạo LabID Event từ 1 dòng vi sinh (MDRO/CDI).
 * Idempotent theo cửa sổ 14 ngày cùng phenotype trên BA.
 */
export async function createLabidEventFromViSinh(viSinhId: string) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  const id = String(viSinhId || "").trim();
  if (!id) return { success: false as const, error: "Thiếu id xét nghiệm" };

  const supabase = createAdminSupabaseClient();
  const { data: vs, error: vsErr } = await supabase
    .from("nkbv_fact_vi_sinh")
    .select(
      "id, ma_benh_an, ma_benh_nhan, loai_benh_pham, loai_benh_pham_chuan, ngay_lay_mau, tac_nhan, is_mdro, mdro_phenotype",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (vsErr || !vs) return { success: false as const, error: vsErr?.message || "Không tìm thấy XN" };

  const ma = String(vs.ma_benh_an || "").trim();
  const phenotype = normalizeMdroPhenotype(
    (vs as { mdro_phenotype?: string | null }).mdro_phenotype,
  );
  const collectionDate = String(vs.ngay_lay_mau || "").slice(0, 10);
  const specimenClass = inferSpecimenClassFromBenhPham(
    String(
      (vs as { loai_benh_pham_chuan?: string | null }).loai_benh_pham_chuan ||
        vs.loai_benh_pham ||
        "",
    ),
  );

  const windowStart = addDays(collectionDate, -14);
  let prior = false;
  if (phenotype && ma && windowStart) {
    const { data: priors } = await supabase
      .from("nkbv_fact_labid_event")
      .select("id")
      .eq("ma_benh_an", ma)
      .eq("phenotype", phenotype)
      .eq("is_active", true)
      .eq("is_event", true)
      .gte("collection_date", windowStart)
      .lte("collection_date", collectionDate)
      .limit(1);
    prior = Boolean(priors?.length);
  }

  const verdict = evaluateLabidEvent({
    phenotype,
    organismName: String(vs.tac_nhan || ""),
    specimenClass,
    collectionDate,
    priorSamePhenotypeWithin14d: prior,
    cdiAssayPositive: phenotype === "CDI" || Boolean((vs as { is_mdro?: boolean }).is_mdro),
  });

  const row = {
    ma_benh_an: ma,
    ma_benh_nhan: vs.ma_benh_nhan ? String(vs.ma_benh_nhan) : null,
    vi_sinh_id: id,
    event_type: verdict.eventType,
    phenotype: phenotype || "OTHER_MDRO",
    organism_category: verdict.organismCategory,
    specimen_class: specimenClass,
    collection_date: collectionDate,
    is_event: verdict.isEvent,
    reason: verdict.reason,
    updated_at: new Date().toISOString(),
    is_active: true,
  };

  const { data, error } = await supabase.from("nkbv_fact_labid_event").insert(row).select().single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data, verdict };
}
