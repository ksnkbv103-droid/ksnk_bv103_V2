"use server";

import { countGiamSatNkbvChoXn } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-dashboard.actions";
import { getCssdStationFlowMap } from "@/modules/cssd-erp/actions/cssd-read.actions";
import { verifyCommandCenterShell } from "../lib/dashboard-command-center-access";

export type CommandCenterQueueSignals = {
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
export async function fetchCommandCenterQueueSignals(filters: {
  tu_ngay: string;
  den_ngay: string;
  khoa_id?: string;
}): Promise<CommandCenterQueueSignals> {
  await verifyCommandCenterShell();

  const [nkbvSettled, cssdFlowSettled] = await Promise.allSettled([
    countGiamSatNkbvChoXn({
      tu_ngay: filters.tu_ngay,
      den_ngay: filters.den_ngay,
      khoa_ghi_nhan_id: filters.khoa_id,
    }),
    getCssdStationFlowMap(),
  ]);

  const nkbv: CommandCenterQueueSignals["nkbv"] = { available: false, choXn: null };
  if (nkbvSettled.status === "fulfilled" && nkbvSettled.value.success) {
    nkbv.available = true;
    nkbv.choXn = nkbvSettled.value.count;
  }

  const cssd: CommandCenterQueueSignals["cssd"] = {
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
