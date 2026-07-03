import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";
import { fetchStrategicAnalytics } from "@/lib/analytics/strategic-analytics-fetch";
import { useAnalyticsFilterPayload } from "@/lib/analytics/use-analytics-filter-payload";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";

type LoaiGiamSat = "TUAN_THU" | "NHAT_KY_VAN_HANH" | "DANH_GIA_HE_THONG" | undefined;

function filterBangKiemByLoai(
  options: { id: string; label?: string }[],
  loai: LoaiGiamSat,
): string[] {
  if (!loai) return options.filter((o) => o.id !== "VST_WHO").map((o) => o.id);
  return options.filter((o) => o.id !== "VST_WHO").map((o) => o.id);
}

export function useGscAnalyticsData(initialLoaiGiamSat?: LoaiGiamSat) {
  const filters = useAnalyticsFilters("gsc");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<GscStrategicPayload | null>(null);

  const bangKiemMasForRpc = useMemo(
    () =>
      filters.selectedBangKiemMas.length > 0
        ? filters.selectedBangKiemMas.filter((id) => id !== "VST_WHO")
        : filterBangKiemByLoai(filters.bangKiemOptions, initialLoaiGiamSat),
    [filters.selectedBangKiemMas, filters.bangKiemOptions, initialLoaiGiamSat],
  );

  const filterPayload = useAnalyticsFilterPayload(filters, { bangKiemMasOverride: bangKiemMasForRpc });

  const loadAnalytics = useCallback(async () => {
    if (!filters.initDone) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { gsc: res } = await fetchStrategicAnalytics(filterPayload(), ["gsc"]);
      if (!res) return;
      if (res.success) setPayload(res.data);
      else setLoadError(res.error);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Có lỗi khi tải thống kê GSC");
    } finally {
      setLoading(false);
    }
  }, [filters.initDone, filterPayload]);

  const loadRef = useRef(loadAnalytics);
  useEffect(() => {
    loadRef.current = loadAnalytics;
  }, [loadAnalytics]);

  useEffect(() => {
    if (filters.initDone) void loadRef.current();
  }, [filters.initDone, loadAnalytics]);

  return {
    ...filters,
    loading,
    loadError,
    payload,
    loadAnalytics,
    initialLoaiGiamSat,
    bkLabelMap: filters.bkLabelMap,
    bkLabelRecord: filters.bkLabelRecord,
  };
}
