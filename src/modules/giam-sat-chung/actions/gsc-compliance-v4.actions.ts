"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { DashboardV4Payload } from "@/modules/dashboard/strategic-dashboard-v3.types";

export type GetGscComplianceV4Input = {
  tu_ngay: string;
  den_ngay: string;
  khoa_id?: string | null;
};

export async function getGscComplianceV4Action(input: GetGscComplianceV4Input): Promise<DashboardV4Payload> {
  await verifyPermission("GIAM_SAT_CHUNG", "view");

  const tu = String(input.tu_ngay || "").trim();
  const den = String(input.den_ngay || "").trim();
  if (!tu || !den) throw new Error("Thiếu khoảng ngày tu_ngay/den_ngay.");

  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase.rpc("rpc_get_compliance_dashboard_v4", {
    p_tu_ngay: tu,
    p_den_ngay: den,
    p_khoa_id: input.khoa_id || null,
  });

  if (error) throw error;

  return (data ?? {
    tu_ngay: tu,
    den_ngay: den,
    khoa_id: input.khoa_id || null,
    vung_nguy_co: [],
    top_vi_pham: [],
    summary: { tong_so_phien: 0, ty_le_tuan_thu_chung: 0.0 },
  }) as DashboardV4Payload;
}
