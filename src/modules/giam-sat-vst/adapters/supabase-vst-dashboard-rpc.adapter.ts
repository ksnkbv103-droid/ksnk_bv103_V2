import type { SupabaseClient } from "@supabase/supabase-js";
import type { VstDashboardFilters } from "../actions/vst-dashboard.types";
import type { IVstDashboardRpcPort } from "../ports/vst-dashboard-rpc.port";

export type VstDashboardRpcRaw = {
  dashData: unknown;
  momentData: unknown;
  momentError: { message: string } | null;
};

/** Adapter mỏng: chỉ gọi RPC — post-process (khoi, moment) ở action. */
export function createSupabaseVstDashboardRpcAdapter(supabase: SupabaseClient): IVstDashboardRpcPort & {
  fetchRaw(filters: VstDashboardFilters, rpcArgs: Record<string, unknown>): Promise<VstDashboardRpcRaw>;
} {
  return {
    async fetchRaw(_filters, rpcArgs) {
      const [dashRes, momentRes] = await Promise.all([
        supabase.rpc("rpc_get_vst_dashboard_v2", rpcArgs),
        supabase.rpc("rpc_get_vst_moment_table_only", rpcArgs),
      ]);
      if (dashRes.error) throw dashRes.error;
      return {
        dashData: dashRes.data,
        momentData: momentRes.data,
        momentError: momentRes.error,
      };
    },
    async fetchPayload() {
      throw new Error("Use getVstDashboardPayload action — adapter chỉ bọc RPC raw");
    },
  };
}
