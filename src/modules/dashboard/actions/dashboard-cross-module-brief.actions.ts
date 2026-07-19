"use server";

import { getGiamSatNkbvDashboardPayload } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-dashboard.actions";
import { getCssdStationFlowMap } from "@/modules/cssd-erp/actions/cssd-read.actions";
import { verifyCommandCenterShell } from "../lib/dashboard-command-center-access";

export type CrossModuleBrief = {
  nkbv: { available: boolean; choXn: number | null; tongPhieu: number | null };
  cssd: { available: boolean; redAlertTotal: number | null; frozenTotal: number | null };
};

/**
 * Tóm tắt mỏng NKBV + CSSD cho Command Center — soft-fail theo quyền module.
 * Không gộp vào CCS.
 */
export async function fetchCommandCenterCrossModuleBrief(filters: {
  tu_ngay: string;
  den_ngay: string;
  khoa_id?: string;
}): Promise<CrossModuleBrief> {
  await verifyCommandCenterShell();

  const [nkbvSettled, cssdSettled] = await Promise.allSettled([
    getGiamSatNkbvDashboardPayload({
      tu_ngay: filters.tu_ngay,
      den_ngay: filters.den_ngay,
      khoa_ghi_nhan_id: filters.khoa_id,
    }),
    getCssdStationFlowMap(),
  ]);

  const nkbv: CrossModuleBrief["nkbv"] = { available: false, choXn: null, tongPhieu: null };
  if (nkbvSettled.status === "fulfilled" && nkbvSettled.value.success && nkbvSettled.value.data) {
    const k = nkbvSettled.value.data.kpis;
    nkbv.available = true;
    nkbv.choXn = k?.dang_va_cho_xn ?? 0;
    nkbv.tongPhieu = k?.tong_phieu ?? 0;
  }

  const cssd: CrossModuleBrief["cssd"] = { available: false, redAlertTotal: null, frozenTotal: null };
  if (cssdSettled.status === "fulfilled" && cssdSettled.value.success) {
    cssd.available = true;
    cssd.redAlertTotal = cssdSettled.value.cells.reduce((s, c) => s + c.redAlertCount, 0);
    cssd.frozenTotal = cssdSettled.value.cells.reduce((s, c) => s + c.frozenCount, 0);
  }

  return { nkbv, cssd };
}
