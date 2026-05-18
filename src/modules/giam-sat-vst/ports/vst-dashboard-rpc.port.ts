import type { VstDashboardFilters, VstDashboardPayload } from "../actions/vst-dashboard.types";

export interface IVstDashboardRpcPort {
  fetchPayload(filters: VstDashboardFilters): Promise<VstDashboardPayload>;
}
