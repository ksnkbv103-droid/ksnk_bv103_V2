import { useCallback, useEffect, useRef, useState } from "react";
import { getVstStrategicAnalytics } from "../actions/vst-strategic-analytics.actions";
import type { VstStrategicPayload } from "../types/vst-strategic.types";
import { buildAnalyticsFilterPayload } from "@/lib/analytics/filter-helpers";
import { useAnalyticsFilters } from "@/lib/analytics/use-analytics-filters";

export function useVstAnalyticsData() {
  const filters = useAnalyticsFilters();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payload, setPayload] = useState<VstStrategicPayload | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!filters.initDone) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getVstStrategicAnalytics(
        buildAnalyticsFilterPayload({
          tuNgay: filters.tuNgay,
          denNgay: filters.denNgay,
          selectedKhoiIds: filters.selectedKhoiIds,
          selectedKhoaIds: filters.selectedKhoaIds,
          selectedNgheIds: filters.selectedNgheIds,
          selectedKhuVucIds: filters.selectedKhuVucIds,
          selectedHinhThucIds: filters.selectedHinhThucIds,
          selectedBangKiemMas: [],
          khoiOptionCount: filters.khoiOptions.length,
          khoaOptionCount: filters.khoaOptions.length,
          ngheOptionCount: filters.ngheOptions.length,
          khuOptionCount: filters.khuVucOptions.length,
        }),
      );
      if (res.success) setPayload(res.data);
      else setLoadError(res.error);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Có lỗi khi tải thống kê VST");
    } finally {
      setLoading(false);
    }
  }, [
    filters.initDone,
    filters.tuNgay,
    filters.denNgay,
    filters.selectedKhoiIds,
    filters.selectedKhoaIds,
    filters.selectedNgheIds,
    filters.selectedKhuVucIds,
    filters.selectedHinhThucIds,
    filters.khoiOptions.length,
    filters.khoaOptions.length,
    filters.ngheOptions.length,
    filters.khuVucOptions.length,
  ]);

  const loadRef = useRef(loadAnalytics);
  useEffect(() => {
    loadRef.current = loadAnalytics;
  }, [loadAnalytics]);

  useEffect(() => {
    if (filters.initDone) void loadRef.current();
  }, [filters.initDone, loadAnalytics]);

  return { ...filters, loading, loadError, payload, loadAnalytics };
}
