"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyCommandCenterShell } from "../lib/dashboard-command-center-access";
import { getCachedDmKhoaPhong, getCachedDmNgheNghiep, getCachedDmKhuVucGiamSat, getCachedDmKhoiKhoa } from "@/lib/cache/master-data-cache";
import type { DashboardFilterOptions } from "../compliance-dashboard.types";

async function loadComplianceFilterOptionsData(supabase: SupabaseClient) {
  const [bkRes, khoiData, khoaData, ngheData, khuData] = await Promise.all([
    supabase.from("dm_bang_kiem").select("id, ma_bk, ten_bang_kiem, is_active").order("ma_bk", { ascending: true }),
    getCachedDmKhoiKhoa(),
    getCachedDmKhoaPhong(),
    getCachedDmNgheNghiep(),
    getCachedDmKhuVucGiamSat(),
  ]);

  if (bkRes.error) return { success: false as const, error: bkRes.error.message };

  const data: DashboardFilterOptions = {
    bang_kiem: [
      { id: "VST_WHO", label: "Vệ sinh tay (WHO)" },
      ...(bkRes.data || []).map((x) => {
        const ma = String(x.ma_bk || "").trim();
        const ten = String(x.ten_bang_kiem || x.ma_bk || "").trim() || "Bảng kiểm";
        const activeTag = x.is_active === false ? " (ngưng dùng)" : "";
        return { id: ma || `BK_ID:${String(x.id || "")}`, label: `${ten}${activeTag}` };
      }),
    ],
    khoi: khoiData.map((x) => ({ id: String(x.id), label: String(x.ten_khoi || "—") })),
    khoa: khoaData.map((x) => {
      const hasCode = x.ma_khoa && x.ma_khoa.trim();
      const displayLabel = hasCode ? `[${x.ma_khoa}] ${x.ten_khoa}` : String(x.ten_khoa || "—");
      return {
        id: String(x.id),
        label: displayLabel,
        khoi_id: String(x.khoi_id || ""),
      };
    }),
    nghe_nghiep: ngheData.map((x) => ({ id: String(x.id), label: String(x.ten_nghe_nghiep || "—") })),
    khu_vuc: khuData.map((x) => ({ id: String(x.id), label: String(x.ten_khu_vuc || "—") })),
  };

  return { success: true as const, data };
}

/** MDM filter options dùng chung Command Center + tab Thống kê VST/GSC. */
export async function getComplianceFilterOptions() {
  const supabase = await createServerSupabaseUserClient();
  await verifyCommandCenterShell();
  return loadComplianceFilterOptionsData(supabase);
}
