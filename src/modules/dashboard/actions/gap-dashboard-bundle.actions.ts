"use server";

import { fetchDashboardPayloadsForSupervisionType } from "../lib/fetch-dashboard-payloads-for-type";
import { buildComplianceGapMap } from "../lib/build-compliance-gap-map";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import type { OverviewDashboardBundleInput } from "./overview-dashboard-bundle.actions";

/**
 * Một round-trip thay cho 3× fetchDashboardPayloadsForSupervisionType trên client (tab Đối soát).
 * Gọi nội bộ trên server → giảm số POST từ trình duyệt và tránh nghẽn song song HTTP.
 */
export async function getDashboardGapBundle(p: OverviewDashboardBundleInput): Promise<{
  vstGap: { kq: VstDashboardPayload | null; cheo: VstDashboardPayload | null; tgs: VstDashboardPayload | null };
  complianceGap: Record<
    string,
    { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }
  >;
}> {
  const [resKq, resCheo, resTgs] = await Promise.all([
    fetchDashboardPayloadsForSupervisionType({ ...p, sType: "KSNK" }),
    fetchDashboardPayloadsForSupervisionType({ ...p, sType: "CHEO" }),
    fetchDashboardPayloadsForSupervisionType({ ...p, sType: "TU_GIAM_SAT" }),
  ]);

  return {
    vstGap: { kq: resKq.vst, cheo: resCheo.vst, tgs: resTgs.vst },
    complianceGap: buildComplianceGapMap(resKq, resCheo, resTgs, p.tuNgay, p.denNgay),
  };
}
