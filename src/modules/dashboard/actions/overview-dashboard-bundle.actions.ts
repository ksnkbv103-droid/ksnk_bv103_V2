"use server";

import { verifyDashboardOverviewWidget } from "../lib/dashboard-command-center-access";
import type { FetchDashboardPayloadsInput } from "../lib/fetch-dashboard-payloads-for-type";
import type { ComplianceDashboardPayload, DashboardKsnkStaffSupervisionRow } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import { fetchKsnkStaffSupervisionForOverview } from "./dashboard-ksnk-staff-stats.actions";

export type OverviewDashboardBundleInput = Omit<FetchDashboardPayloadsInput, "sType">;

/**
 * Một POST server cho tab Cơ cấu nguồn: chỉ tải workload KSNK + đã có summary/khoa từ luồng chính.
 * Không gọi RPC chi tiết theo từng bảng kiểm (trend/violation) — các tab chuyên sâu mới fetch.
 */
export async function getOverviewDashboardBundle(p: OverviewDashboardBundleInput): Promise<{
  vst: VstDashboardPayload | null;
  gsc: Record<string, ComplianceDashboardPayload>;
  ksnkStaffSupervision: DashboardKsnkStaffSupervisionRow[];
  showKsnkStaffWorkload: boolean;
}> {
  await verifyDashboardOverviewWidget();
  const ksnkBundle = await fetchKsnkStaffSupervisionForOverview(p);
  return {
    vst: null,
    gsc: {},
    ksnkStaffSupervision: ksnkBundle.rows,
    showKsnkStaffWorkload: ksnkBundle.showKsnkStaffWorkload,
  };
}
