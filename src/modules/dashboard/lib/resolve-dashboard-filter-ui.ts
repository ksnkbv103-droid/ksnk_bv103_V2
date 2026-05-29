import type { ComplianceDashboardPayload } from "../compliance-dashboard.types";
import type { DashboardHeaderFallback } from "../hooks/dashboard-types";

const BANG_KIEM_FALLBACK = [{ id: "VST_WHO", label: "Vệ sinh tay (WHO)" }] as const;

export function resolveDashboardFilterUi(
  filterOptions: ComplianceDashboardPayload["options"] | null,
  header?: DashboardHeaderFallback | null,
) {
  const bangKiemOptions = filterOptions?.bang_kiem?.length ? filterOptions.bang_kiem : [...BANG_KIEM_FALLBACK];
  const khoiOptions = filterOptions?.khoi?.length ? filterOptions.khoi : [];
  const khoaOptions =
    filterOptions?.khoa?.length
      ? filterOptions.khoa
      : header?.khoas?.map((k) => {
          const hasCode = k.ma_danh_muc && k.ma_danh_muc.trim();
          const label = hasCode ? `[${k.ma_danh_muc}] ${k.ten_danh_muc}` : String(k.ten_danh_muc || "—");
          return { id: k.id, label };
        }) || [];
  const ngheOptions =
    filterOptions?.nghe_nghiep?.length
      ? filterOptions.nghe_nghiep
      : header?.ngheNghieps?.map((n) => ({ id: n.id, label: String(n.ten_danh_muc || "—") })) || [];
  const khuVucOptions =
    filterOptions?.khu_vuc?.length
      ? filterOptions.khu_vuc
      : header?.khuVucs?.map((k) => ({ id: k.id, label: String(k.ten_danh_muc || "—") })) || [];
  const bkLabelMap = new Map(bangKiemOptions.map((x) => [x.id, x.label] as const));
  return { bangKiemOptions, khoiOptions, khoaOptions, ngheOptions, khuVucOptions, bkLabelMap };
}
