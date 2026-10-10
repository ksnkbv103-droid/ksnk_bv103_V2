"use server";

import { verifyAnyPermission } from "@/lib/server-permission";
import { instrumentChangeRequiresIncidentResult } from "@/lib/domain/cssd-instrument-incident";
import { type InstrumentIssueType } from "@/lib/master-data/instrument-issue-core";

/**
 * Đã đóng: hỏng/mất không phiếu. Dùng form sự cố CSSD.
 */
export async function reportChiTietInstrumentIssueAction(_params: {
  chiTietId: string;
  issueType: InstrumentIssueType;
  note?: string;
  quantity?: number;
  quyTrinhId?: string | null;
}) {
  await verifyAnyPermission([
    { moduleKey: "DC_LE", action: "edit" },
    { moduleKey: "CSSD_WORKFLOW", action: "edit" },
  ]);
  return instrumentChangeRequiresIncidentResult();
}

