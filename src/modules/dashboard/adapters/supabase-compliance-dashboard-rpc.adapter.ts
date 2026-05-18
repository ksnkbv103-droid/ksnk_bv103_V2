import type { SupabaseClient } from "@supabase/supabase-js";
import { useComplianceDashboardMultiV2 } from "@/lib/bv103-feature-config";
import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type {
  ComplianceMultiRpcParams,
  IComplianceDashboardRpcPort,
} from "../ports/compliance-dashboard-rpc.port";

type RpcRow = {
  summary?: ComplianceDashboardPayload["summary"];
  by_khoa?: ComplianceDashboardPayload["by_khoa"];
  by_nghe_nghiep?: ComplianceDashboardPayload["by_nghe_nghiep"];
  by_khu_vuc?: ComplianceDashboardPayload["by_khu_vuc"];
  trend?: ComplianceDashboardPayload["trend"];
  violations?: ComplianceDashboardPayload["violations"];
  supervision_sources?: ComplianceDashboardPayload["supervision_sources"];
  participation?: ComplianceDashboardPayload["participation"];
};

export function createSupabaseComplianceDashboardRpcAdapter(
  supabase: SupabaseClient,
): IComplianceDashboardRpcPort {
  const rpcName = useComplianceDashboardMultiV2()
    ? "rpc_get_compliance_dashboard_multi_v2"
    : "rpc_get_compliance_dashboard_multi_v1";

  return {
    async fetchMultiPayload(params: ComplianceMultiRpcParams) {
      const { data: rpcData, error } = await supabase.rpc(rpcName, {
        p_tu_ngay: params.tuNgay,
        p_den_ngay: params.denNgay,
        p_bang_kiem_mas: params.bangKiemMas.length > 0 ? params.bangKiemMas : null,
        p_khoi_ids: params.khoiIds,
        p_khoa_ids: params.khoaIds,
        p_nghe_nghiep_ids: params.ngheNghiepIds,
        p_khu_vuc_ids: params.khuVucIds,
        p_supervision_type: params.supervisionType || "ALL",
      });
      if (error) throw new Error(error.message);

      const result: Record<string, ComplianceDashboardPayload> = {};
      const tuNgay = params.tuNgay;
      const denNgay = params.denNgay;
      const emptyOptions = { bang_kiem: [], khoi: [], khoa: [], nghe_nghiep: [], khu_vuc: [] };

      Object.entries((rpcData as object) || {}).forEach(([bk, d]) => {
        const row = d as RpcRow;
        result[bk] = {
          tu_ngay: tuNgay,
          den_ngay: denNgay,
          options: emptyOptions,
          summary: row.summary ?? { tong_phien: 0, tong_quan_sat: 0, tong_vi_pham: 0, ty_le_tuan_thu: 0 },
          by_khoa: row.by_khoa || [],
          by_nghe_nghiep: row.by_nghe_nghiep || [],
          by_khu_vuc: row.by_khu_vuc || [],
          trend: row.trend || [],
          top5_khoa: (row.by_khoa || []).slice(0, 5),
          bottom5_khoa: (row.by_khoa || []).slice(-5).reverse(),
          rank_khoa: (row.by_khoa || []).map((x, i, arr) => ({
            ...x,
            stt: i + 1,
            nhom_mau: i < 5 ? "GREEN" : i >= arr.length - 5 ? "RED" : "BLUE",
          })),
          violations: row.violations || [],
          supervision_sources: row.supervision_sources || [],
          participation: row.participation || [],
        };
      });

      return result;
    },
  };
}
