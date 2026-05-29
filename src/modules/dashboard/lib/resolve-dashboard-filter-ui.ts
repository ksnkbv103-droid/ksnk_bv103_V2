import type { DashboardFilterOptions } from "../compliance-dashboard.types";

const BANG_KIEM_FALLBACK = [{ id: "VST_WHO", label: "Vệ sinh tay (WHO)" }] as const;

export function resolveDashboardFilterUi(filterOptions: DashboardFilterOptions | null) {
  const bangKiemOptions = filterOptions?.bang_kiem?.length ? filterOptions.bang_kiem : [...BANG_KIEM_FALLBACK];
  const khoiOptions = filterOptions?.khoi?.length ? filterOptions.khoi : [];
  const khoaOptions = filterOptions?.khoa?.length ? filterOptions.khoa : [];
  const ngheOptions = filterOptions?.nghe_nghiep?.length ? filterOptions.nghe_nghiep : [];
  const khuVucOptions = filterOptions?.khu_vuc?.length ? filterOptions.khu_vuc : [];
  const bkLabelMap = new Map(bangKiemOptions.map((x) => [x.id, x.label] as const));
  return { bangKiemOptions, khoiOptions, khoaOptions, ngheOptions, khuVucOptions, bkLabelMap };
}
