import type { Dispatch, SetStateAction } from "react";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { VstDashboardPayload } from "@/modules/giam-sat-vst/actions/vst-dashboard.types";
import type {
  DashboardSummaryRow,
  DashboardKhoaOverviewRow,
  DashboardKsnkStaffSupervisionRow,
} from "../compliance-dashboard.types";
import type { DashboardLoadResult } from "./dashboard-load-execution";

type GapCompliance = Record<
  string,
  { kq: ComplianceDashboardPayload; cheo: ComplianceDashboardPayload; tgs: ComplianceDashboardPayload }
>;

export type DashboardLoadApplySetters = {
  setSummaryTable: (v: DashboardSummaryRow[]) => void;
  setKhoaOverviewRows: (v: DashboardKhoaOverviewRow[]) => void;
  setVstPayload: (v: VstDashboardPayload | null) => void;
  setCompliancePayloads: (v: Record<string, ComplianceDashboardPayload>) => void;
  setVstGapPayloads: (
    v: { kq: VstDashboardPayload | null; cheo: VstDashboardPayload | null; tgs: VstDashboardPayload | null } | null,
  ) => void;
  setComplianceGapPayloads: (v: GapCompliance) => void;
  setKsnkStaffSupervision: (v: DashboardKsnkStaffSupervisionRow[]) => void;
  setShowKsnkStaffWorkload: (v: boolean) => void;
  setSelectedBangKiemMas: Dispatch<SetStateAction<string[]>>;
  shouldUpdateBangKiemSelection: (prev: string[], next: string[]) => boolean;
};

export function applyDashboardLoadResult(out: DashboardLoadResult, setters: DashboardLoadApplySetters): void {
  setters.setSummaryTable(out.summaryRows);
  setters.setKhoaOverviewRows(out.khoaOverviewRows);
  if (out.nextBangKiemSelection) {
    const next = out.nextBangKiemSelection;
    setters.setSelectedBangKiemMas((prev) =>
      setters.shouldUpdateBangKiemSelection(prev, next) ? next : prev,
    );
  }
  setters.setVstPayload(out.vst);
  setters.setCompliancePayloads(out.gsc);
  setters.setVstGapPayloads(out.vstGap);
  setters.setComplianceGapPayloads(out.complianceGap ?? {});
  setters.setKsnkStaffSupervision(out.ksnkStaffSupervision);
  setters.setShowKsnkStaffWorkload(out.showKsnkStaffWorkload);
}
