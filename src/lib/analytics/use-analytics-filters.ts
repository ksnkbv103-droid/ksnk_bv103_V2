import { useEffect, useState } from "react";
import { format } from "date-fns";
import { bv103DefaultTuNgayFromToday } from "@/lib/bv103-analytics-default-range";
import { getComplianceFilterOptions } from "@/modules/dashboard/actions/compliance-dashboard.actions";
import { resolveDashboardFilterUi } from "@/modules/dashboard/lib/resolve-dashboard-filter-ui";
import { pruneKhoaIdsForKhoiSelection, sortedJoinIds } from "@/lib/analytics/filter-helpers";
import type { ComplianceDashboardPayload } from "@/modules/dashboard/compliance-dashboard.types";

export function useAnalyticsFilters() {
  const [selectedBangKiemMas, setSelectedBangKiemMas] = useState<string[]>([]);
  const [selectedKhoiIds, setSelectedKhoiIds] = useState<string[]>([]);
  const [selectedKhoaIds, setSelectedKhoaIds] = useState<string[]>([]);
  const [selectedNgheIds, setSelectedNgheIds] = useState<string[]>([]);
  const [selectedKhuVucIds, setSelectedKhuVucIds] = useState<string[]>([]);
  const [selectedHinhThucIds, setSelectedHinhThucIds] = useState<string[]>([]);
  const [tuNgay, setTuNgay] = useState(() => bv103DefaultTuNgayFromToday());
  const [denNgay, setDenNgay] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filterOptions, setFilterOptions] = useState<ComplianceDashboardPayload["options"] | null>(null);
  const [initDone, setInitDone] = useState(false);

  const { bangKiemOptions, khoiOptions, khoaOptions, ngheOptions, khuVucOptions, bkLabelMap } =
    resolveDashboardFilterUi(filterOptions, null);

  useEffect(() => {
    if (!initDone || khoiOptions.length === 0) return;
    setSelectedKhoaIds((prev) => {
      const next = pruneKhoaIdsForKhoiSelection(prev, selectedKhoiIds, khoaOptions, khoiOptions.length);
      return sortedJoinIds(prev) === sortedJoinIds(next) ? prev : next;
    });
  }, [initDone, selectedKhoiIds, khoaOptions, khoiOptions.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getComplianceFilterOptions();
        if (cancelled) return;
        if (res.success) {
          setFilterOptions(res.data);
          setSelectedBangKiemMas([]);
          setSelectedHinhThucIds([]);
          setSelectedKhoiIds(res.data.khoi.map((x) => x.id));
          setSelectedKhoaIds(res.data.khoa.map((x) => x.id));
          setSelectedNgheIds(res.data.nghe_nghiep.map((x) => x.id));
          setSelectedKhuVucIds(res.data.khu_vuc.map((x) => x.id));
          setInitDone(true);
        }
      } catch (err) {
        console.error("[AnalyticsFilters] init error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    selectedBangKiemMas,
    setSelectedBangKiemMas,
    selectedKhoiIds,
    setSelectedKhoiIds,
    selectedKhoaIds,
    setSelectedKhoaIds,
    selectedNgheIds,
    setSelectedNgheIds,
    selectedKhuVucIds,
    setSelectedKhuVucIds,
    selectedHinhThucIds,
    setSelectedHinhThucIds,
    tuNgay,
    setTuNgay,
    denNgay,
    setDenNgay,
    filterOptions,
    initDone,
    bangKiemOptions,
    khoiOptions,
    khoaOptions,
    ngheOptions,
    khuVucOptions,
    bkLabelMap,
  };
}
