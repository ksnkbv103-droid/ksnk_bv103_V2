import type {
  ComplianceDashboardPayload,
  ComplianceDashboardGroupRow as GroupRow,
  ComplianceDashboardViolationRow as ViolationRow,
} from "../compliance-dashboard.types";

type GscRpcRow = {
  summary?: ComplianceDashboardPayload["summary"];
  by_khoa?: GroupRow[];
  by_nghe_nghiep?: GroupRow[];
  by_khu_vuc?: GroupRow[];
  trend?: ComplianceDashboardPayload["trend"];
  violations?: ViolationRow[];
  supervision_sources?: ComplianceDashboardPayload["supervision_sources"];
  participation?: ComplianceDashboardPayload["participation"];
};

/** Chuẩn hóa JSON trả về từ `rpc_get_compliance_dashboard_v2`. */
export function mapGscDashboardRpcRowToPayload(
  d: unknown,
  tuStr: string,
  denStr: string,
): ComplianceDashboardPayload {
  const row = (d ?? {}) as GscRpcRow;
  const byKhoa = row.by_khoa || [];
  return {
    tu_ngay: tuStr,
    den_ngay: denStr,
    options: { bang_kiem: [], khoi: [], khoa: [], nghe_nghiep: [], khu_vuc: [] },
    summary: row.summary ?? { tong_phien: 0, tong_quan_sat: 0, tong_vi_pham: 0, ty_le_tuan_thu: 0 },
    by_khoa: byKhoa,
    by_nghe_nghiep: row.by_nghe_nghiep || [],
    by_khu_vuc: row.by_khu_vuc || [],
    trend: row.trend || [],
    top5_khoa: byKhoa.slice(0, 5),
    bottom5_khoa: byKhoa.slice(-5).reverse(),
    rank_khoa: byKhoa.map((x, i, arr) => ({
      ...x,
      stt: i + 1,
      nhom_mau: i < 5 ? "GREEN" : i >= arr.length - 5 ? "RED" : "BLUE",
    })),
    violations: row.violations || [],
    supervision_sources: row.supervision_sources || [],
    participation: row.participation || [],
  };
}
