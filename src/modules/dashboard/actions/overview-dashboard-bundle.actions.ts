"use server";

import { verifyDashboardOverviewWidget } from "../lib/dashboard-command-center-access";
import { fetchDashboardPayloadsForSupervisionType } from "../lib/fetch-dashboard-payloads-for-type";
import { mergeParticipationRows } from "../lib/dashboard-hook-helpers";
import type { FetchDashboardPayloadsInput } from "../lib/fetch-dashboard-payloads-for-type";
import type { ComplianceDashboardPayload, DashboardKsnkStaffSupervisionRow } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import { fetchKsnkStaffSupervisionForOverview } from "./dashboard-ksnk-staff-stats.actions";

export type OverviewDashboardBundleInput = Omit<FetchDashboardPayloadsInput, "sType">;

/**
 * Một round-trip thay cho 2× fetchDashboardPayloadsForSupervisionType trên client
 * (overview cần ALL + TU_GIAM_SAT để merge participation).
 * Gọi nội bộ cùng stack server → không nhân đôi HTTP POST từ trình duyệt.
 */
export async function getOverviewDashboardBundle(p: OverviewDashboardBundleInput): Promise<{
  vst: VstDashboardPayload | null;
  gsc: Record<string, ComplianceDashboardPayload>;
  tuGiamSatParticipation: ReturnType<typeof mergeParticipationRows>;
  ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[];
  showKsnkStaffWorkload: boolean;
}> {
  await verifyDashboardOverviewWidget();
  const [res, tgs, ksnkBundle] = await Promise.all([
    fetchDashboardPayloadsForSupervisionType({ ...p, sType: "ALL" }),
    fetchDashboardPayloadsForSupervisionType({ ...p, sType: "TU_GIAM_SAT" }),
    fetchKsnkStaffSupervisionForOverview(p),
  ]);
  return {
    vst: res.vst,
    gsc: res.gsc,
    tuGiamSatParticipation: mergeParticipationRows(tgs.vst, tgs.gsc),
    ksnkStaffSupervision: ksnkBundle.rows,
    showKsnkStaffWorkload: ksnkBundle.showKsnkStaffWorkload,
  };
}
