"use server";

import { getGiamSatNkbvDashboardPayload } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-dashboard.actions";
import { getCssdStationFlowMap } from "@/modules/cssd-erp/actions/cssd-read.actions";
import { verifyCommandCenterShell } from "../lib/dashboard-command-center-access";

/** Tín hiệu hàng đợi Tổng quan — không tải nhân sự / gói CSSD đầy. */
export type FourPillarsBrief = {
  cssd: {
    available: boolean;
    red_alert_total: number | null;
    frozen_total: number | null;
  };
  nkbv: {
    available: boolean;
    choXn: number | null;
  };
};

/**
 * Tín hiệu Việc hôm nay: NKBV chờ xác nhận + CSSD đỏ/đóng băng. Soft-fail từng nguồn.
 */
export async function fetchCommandCenterFourPillarsBrief(filters: {
  tu_ngay: string;
  den_ngay: string;
  khoa_id?: string;
}): Promise<FourPillarsBrief> {
  await verifyCommandCenterShell();

  const [nkbvSettled, cssdFlowSettled] = await Promise.allSettled([
    getGiamSatNkbvDashboardPayload({
      tu_ngay: filters.tu_ngay,
      den_ngay: filters.den_ngay,
      khoa_ghi_nhan_id: filters.khoa_id,
    }),
    getCssdStationFlowMap(),
  ]);

  const nkbv: FourPillarsBrief["nkbv"] = { available: false, choXn: null };
  if (nkbvSettled.status === "fulfilled" && nkbvSettled.value.success && nkbvSettled.value.data) {
    nkbv.available = true;
    nkbv.choXn = nkbvSettled.value.data.kpis?.dang_va_cho_xn ?? 0;
  }

  const cssd: FourPillarsBrief["cssd"] = {
    available: false,
    red_alert_total: null,
    frozen_total: null,
  };
  if (cssdFlowSettled.status === "fulfilled" && cssdFlowSettled.value.success) {
    cssd.available = true;
    cssd.red_alert_total = cssdFlowSettled.value.cells.reduce((s, c) => s + c.redAlertCount, 0);
    cssd.frozen_total = cssdFlowSettled.value.cells.reduce((s, c) => s + c.frozenCount, 0);
  }

  return { cssd, nkbv };
}
