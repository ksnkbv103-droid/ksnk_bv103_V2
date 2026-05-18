import type { ParsedComplianceDashboardFilters } from "@/lib/validations/dashboard-compliance.filters";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";

export type ComplianceMultiRpcParams = {
  tuNgay: string;
  denNgay: string;
  bangKiemMas: string[];
  khoiIds: string[] | null;
  khoaIds: string[] | null;
  ngheNghiepIds: string[] | null;
  khuVucIds: string[] | null;
  supervisionType: ParsedComplianceDashboardFilters["supervision_type"];
};

export interface IComplianceDashboardRpcPort {
  fetchMultiPayload(params: ComplianceMultiRpcParams): Promise<Record<string, ComplianceDashboardPayload>>;
}
