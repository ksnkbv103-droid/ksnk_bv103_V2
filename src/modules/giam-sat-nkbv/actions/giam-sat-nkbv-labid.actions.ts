"use server";

import { verifyPermission } from "@/lib/server-permission";

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

const LABID_OFF = "LabID / MDRO module không dùng tại BV103 — không ghi sự kiện LabID.";

export async function listNkbvLabidEvents(_maBenhAn: string) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  return { success: true as const, data: [] as LabidEventRecord[] };
}

export async function createLabidEventFromViSinh(_viSinhId: string) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  return { success: false as const, error: LABID_OFF };
}
